import { REGIONS, TOPICS } from "./news-types";
import type { CaseProgress, CaseReader, CaseSnapshot, CaseSource, CaseUpdate, CasesResponse, TrackedCase } from "./case-types";

export const CASE_READER_KEY = "siden-sidst-cases-reader-v1";
export const CASE_CACHE_KEY = "siden-sidst-cases-cache-v1";
export const MAX_FOLLOWED_CASES = 100;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 3000): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const date = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!parts) return false;
  const day = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return day.getUTCFullYear() === Number(parts[1]) && day.getUTCMonth() + 1 === Number(parts[2]) && day.getUTCDate() === Number(parts[3]);
};
const nullableDate = (value: unknown) => value === null || date(value);
const id = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value) && !["constructor", "prototype"].includes(value);
const revision = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1_000_000;
export function safeCaseUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2500) return false;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
function sourceIds(value: unknown, known: Set<string>, allowEmpty = false): value is string[] {
  return Array.isArray(value) && value.length <= 40 && (allowEmpty || value.length > 0) && value.every(item => typeof item === "string" && known.has(item));
}
function isSnapshot(value: unknown, known: Set<string>): value is CaseSnapshot {
  if (!isObject(value) || typeof value.status !== "string" || !["active", "awaiting", "resolved"].includes(value.status) || !text(value.answer, 4000)) return false;
  if (!Array.isArray(value.openQuestions) || value.openQuestions.length > 12 || !value.openQuestions.every(item => text(item, 1500))) return false;
  const next = value.nextStep;
  return isObject(next) && text(next.label, 1500) && nullableDate(next.expectedAt) && sourceIds(next.sourceIds, known, true);
}
function isCaseSource(value: unknown): value is CaseSource {
  return isObject(value) && id(value.id) && text(value.title, 500) && text(value.publisher, 200) && safeCaseUrl(value.url) && nullableDate(value.publishedAt) && date(value.checkedAt) && text(value.evidence, 3000);
}
export function isTrackedCase(value: unknown): value is TrackedCase {
  if (!isObject(value) || !id(value.id) || !text(value.question, 500) || !text(value.description, 2000)) return false;
  if (!Array.isArray(value.topics) || value.topics.length < 1 || value.topics.length > TOPICS.length || !value.topics.every(item => TOPICS.some(topic => topic.id === item))) return false;
  if (!REGIONS.some(region => region.id === value.region) || typeof value.scope !== "string" || !["local", "national", "global"].includes(value.scope) || typeof value.imageKey !== "string" || !["city", "climate", "mobility"].includes(value.imageKey)) return false;
  if (!Array.isArray(value.sources) || !value.sources.length || value.sources.length > 200 || !value.sources.every(isCaseSource)) return false;
  const sources = new Set(value.sources.map(source => source.id));
  if (sources.size !== value.sources.length || !Array.isArray(value.updates) || !value.updates.length || value.updates.length > 500) return false;
  let previousRevision = 0;
  const updateIds = new Set<string>();
  for (const update of value.updates) {
    if (!isObject(update) || !id(update.id) || updateIds.has(update.id) || !revision(update.revision) || update.revision <= previousRevision) return false;
    if (typeof update.kind !== "string" || !["background", "development", "decision", "schedule", "correction", "resolution"].includes(update.kind) || !text(update.title, 500) || !text(update.change, 4000) || !text(update.whyItMatters) || !nullableDate(update.occurredAt) || !date(update.recordedAt)) return false;
    if (!sourceIds(update.sourceIds, sources) || !isSnapshot(update.snapshot, sources)) return false;
    if (update.correctsUpdateId !== undefined && (typeof update.correctsUpdateId !== "string" || !updateIds.has(update.correctsUpdateId))) return false;
    previousRevision = update.revision; updateIds.add(update.id);
  }
  const monitor = value.monitoring;
  if (!isObject(monitor) || !Array.isArray(monitor.sourceUrls) || !monitor.sourceUrls.length || monitor.sourceUrls.length > 60 || !monitor.sourceUrls.every(safeCaseUrl) || !Array.isArray(monitor.keywords) || monitor.keywords.length > 50 || !monitor.keywords.every(item => text(item, 150)) || typeof monitor.reviewEveryHours !== "number" || !Number.isFinite(monitor.reviewEveryHours) || monitor.reviewEveryHours < 1 || monitor.reviewEveryHours > 720) return false;
  const check = value.lastCheck;
  return check === null || isObject(check) && date(check.checkedAt) && typeof check.status === "string" && ["checked", "partial", "unavailable", "pending_review"].includes(check.status) && text(check.note) && sourceIds(check.sourceIds, sources, true);
}

export function parseCasesResponse(value: unknown): CasesResponse | null {
  if (!isObject(value) || !Array.isArray(value.cases) || !value.cases.length || value.cases.length > 150 || !value.cases.every(isTrackedCase) || !date(value.generatedAt) || typeof value.storage !== "string" || !["database", "catalog"].includes(value.storage)) return null;
  if (new Set(value.cases.map(item => item.id)).size !== value.cases.length) return null;
  const monitoring = value.monitoring;
  if (!isObject(monitoring) || typeof monitoring.state !== "string" || !["scheduled", "manual"].includes(monitoring.state) || !text(monitoring.label, 2000)) return null;
  return value as unknown as CasesResponse;
}

/** A new object containing only private reader preferences, never source/account fields. */
export function normalizeCaseReader(value: unknown, catalog?: TrackedCase[]): CaseReader {
  const result: CaseReader = { version: 1, cases: {} };
  if (!isObject(value) || value.version !== 1 || !isObject(value.cases)) return result;
  const known = catalog ? new Map(catalog.map(item => [item.id, item])) : null;
  for (const [caseId, raw] of Object.entries(value.cases)) {
    if (Object.keys(result.cases).length >= MAX_FOLLOWED_CASES) break;
    if (!id(caseId) || !isObject(raw) || !date(raw.followedAt) || !revision(raw.followedRevision) || raw.followedRevision < 1) continue;
    if (known && !known.has(caseId)) continue;
    const max = known?.has(caseId) ? latestCaseUpdate(known.get(caseId)!).revision : 1_000_000;
    const bounded = (field: unknown) => revision(field) ? Math.min(field, max) : 0;
    const seen = bounded(raw.seenRevision), opened = Math.min(bounded(raw.openedRevision), seen);
    result.cases[caseId] = {
      followedAt: raw.followedAt, followedRevision: Math.min(raw.followedRevision, max),
      seenRevision: seen, openedRevision: opened,
      acknowledgedRevision: Math.min(bounded(raw.acknowledgedRevision), opened),
      priority: raw.priority === "high" ? "high" : "normal", paused: raw.paused === true,
    };
  }
  return result;
}
export function latestCaseUpdate(item: TrackedCase): CaseUpdate { return item.updates[item.updates.length - 1]; }
export function caseUpdateAt(item: TrackedCase, target: number): CaseUpdate | undefined { return item.updates.find(update => update.revision === target); }
export function caseNewUpdates(item: TrackedCase, progress?: CaseProgress): CaseUpdate[] {
  if (!progress || progress.paused) return [];
  const baseline = progress.acknowledgedRevision || progress.followedRevision;
  return item.updates.filter(update => update.revision > baseline);
}
export function caseNeedsAttention(item: TrackedCase, progress?: CaseProgress): boolean {
  return !!progress && !progress.paused && (progress.acknowledgedRevision === 0 || caseNewUpdates(item, progress).length > 0);
}
export function followCase(reader: CaseReader, item: TrackedCase, at = new Date().toISOString()): CaseReader {
  if (Object.hasOwn(reader.cases, item.id) || Object.keys(reader.cases).length >= MAX_FOLLOWED_CASES || !date(at)) return reader;
  return { version: 1, cases: { ...reader.cases, [item.id]: { followedAt: at, followedRevision: latestCaseUpdate(item).revision, acknowledgedRevision: 0, seenRevision: 0, openedRevision: 0, priority: "normal", paused: false } } };
}
export function unfollowCase(reader: CaseReader, caseId: string): CaseReader {
  if (!Object.hasOwn(reader.cases, caseId)) return reader;
  const cases = { ...reader.cases }; delete cases[caseId]; return { version: 1, cases };
}
export function setCaseOptions(reader: CaseReader, caseId: string, options: { paused?: boolean; priority?: "normal" | "high" }): CaseReader {
  if (!Object.hasOwn(reader.cases, caseId)) return reader;
  const current = reader.cases[caseId];
  return { version: 1, cases: { ...reader.cases, [caseId]: { ...current, paused: typeof options.paused === "boolean" ? options.paused : current.paused, priority: options.priority === "normal" || options.priority === "high" ? options.priority : current.priority } } };
}
export function markCaseShown(reader: CaseReader, item: TrackedCase, visibleRevision: number): CaseReader {
  const current = Object.hasOwn(reader.cases, item.id) ? reader.cases[item.id] : undefined;
  if (!current || !caseUpdateAt(item, visibleRevision) || current.seenRevision >= visibleRevision) return reader;
  return { version: 1, cases: { ...reader.cases, [item.id]: { ...current, seenRevision: visibleRevision } } };
}
export function markCaseOpened(reader: CaseReader, item: TrackedCase, visibleRevision: number): CaseReader {
  const current = Object.hasOwn(reader.cases, item.id) ? reader.cases[item.id] : undefined;
  if (!current || !caseUpdateAt(item, visibleRevision)) return reader;
  if (current.openedRevision >= visibleRevision && current.seenRevision >= visibleRevision) return reader;
  return { version: 1, cases: { ...reader.cases, [item.id]: { ...current, seenRevision: Math.max(current.seenRevision, visibleRevision), openedRevision: Math.max(current.openedRevision, visibleRevision) } } };
}
/** Acknowledges only the edition actually opened, even if a newer one has arrived. */
export function acknowledgeCase(reader: CaseReader, item: TrackedCase, visibleRevision: number): CaseReader {
  const current = Object.hasOwn(reader.cases, item.id) ? reader.cases[item.id] : undefined;
  if (!current || !caseUpdateAt(item, visibleRevision) || visibleRevision > current.openedRevision || visibleRevision > current.seenRevision || visibleRevision <= current.acknowledgedRevision) return reader;
  return { version: 1, cases: { ...reader.cases, [item.id]: { ...current, acknowledgedRevision: visibleRevision } } };
}
export function caseProfileExport(reader: CaseReader) {
  return { product: "Siden sidst", kind: "case-profile", exportedAt: new Date().toISOString(), ...normalizeCaseReader(reader) };
}
export function caseProfileImport(value: unknown, catalog: TrackedCase[]): CaseReader {
  if (!isObject(value) || value.product !== "Siden sidst" || value.kind !== "case-profile" || value.version !== 1 || !isObject(value.cases)) throw new Error("Vælg en sagseksport fra Siden sidst.");
  const result = normalizeCaseReader(value, catalog);
  if (Object.keys(value.cases).length && !Object.keys(result.cases).length) throw new Error("Eksporten indeholder ingen gyldige sager fra dette katalog.");
  return result;
}
