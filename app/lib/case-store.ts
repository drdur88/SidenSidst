import { CASE_CATALOG } from "./case-catalog";
import { TOPICS, REGIONS } from "./news-types";
import type { TrackedCase, CaseSource, CaseUpdate, CaseCheck, CaseSnapshot } from "./case-types";

const MAX_CASES = 50;
const MAX_SOURCES = 200;
const MAX_UPDATES = 500;
const INITIALIZED = new WeakMap<D1Database, Promise<void>>();
type CaseMetadata = Omit<TrackedCase, "sources" | "updates" | "lastCheck">;
type MetadataRow = { id: string; metadata_json: string; current_revision: number };
type ContentRow = { case_id: string; content_json: string };

export class CaseStoreError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
function invalid(message: string): never { throw new CaseStoreError(400, "invalid_case_data", message); }
function conflict(message: string): never { throw new CaseStoreError(409, "revision_conflict", message); }
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${label} skal være et objekt.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid(`${label} er ugyldig eller for lang.`);
  return value.trim();
}
function id(value: unknown, label: string): string {
  const result = text(value, label, 100);
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(result) || ["constructor", "prototype"].includes(result)) invalid(`${label} indeholder ugyldige tegn.`);
  return result;
}
function date(value: unknown, label: string, nullable = false, withTime = false): string | null {
  if (nullable && value === null) return null;
  const result = text(value, label, 40);
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(result);
  if (!m || !Number.isFinite(Date.parse(result)) || (withTime && !result.includes("T"))) invalid(`${label} skal være en gyldig dato.`);
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (day.getUTCFullYear() !== Number(m[1]) || day.getUTCMonth() + 1 !== Number(m[2]) || day.getUTCDate() !== Number(m[3])) invalid(`${label} findes ikke i kalenderen.`);
  return withTime ? new Date(result).toISOString() : result;
}
function strings(value: unknown, label: string, maxItems: number, maxLength: number, allowEmpty = false): string[] {
  if (!Array.isArray(value) || value.length > maxItems || (!allowEmpty && !value.length)) invalid(`${label} har et ugyldigt antal elementer.`);
  return [...new Set(value.map(item => text(item, label, maxLength)))];
}
function sourceIds(value: unknown, available: Set<string>, label: string, allowEmpty = false): string[] {
  const result = strings(value, label, 40, 100, allowEmpty).map(item => id(item, label));
  if (result.some(item => !available.has(item))) invalid(`${label} henviser til en ukendt kilde.`);
  return result;
}
function safeUrl(value: unknown): string {
  const raw = text(value, "Kildelink", 2048);
  let url: URL;
  try { url = new URL(raw); } catch { return invalid("Kildelinket er ugyldigt."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".") || /[:%]/.test(url.hostname) || /^\d+(?:\.\d+){3}$/.test(url.hostname) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) invalid("Kildelinket skal være en offentlig HTTPS-adresse.");
  return url.href;
}
function normalizeSource(value: unknown): CaseSource {
  const s = object(value, "Kilden");
  return { id: id(s.id, "Kilde-ID"), title: text(s.title, "Kildetitel", 400), publisher: text(s.publisher, "Afsender", 200), url: safeUrl(s.url), publishedAt: date(s.publishedAt, "Udgivelsesdato", true), checkedAt: date(s.checkedAt, "Kildekontrol", false, true)!, evidence: text(s.evidence, "Kildens dokumentation", 2000) };
}
function normalizeSnapshot(value: unknown, available: Set<string>): CaseSnapshot {
  const s = object(value, "Sagsversionen"), next = object(s.nextStep, "Næste skridt");
  if (typeof s.status !== "string" || !["active", "awaiting", "resolved"].includes(s.status)) invalid("Sagsstatus er ukendt.");
  const expectedAt = date(next.expectedAt, "Forventet dato", true);
  const refs = sourceIds(next.sourceIds, available, "Næste skridts kilder", expectedAt === null);
  return { status: s.status as CaseSnapshot["status"], answer: text(s.answer, "Aktuel status", 4000), openQuestions: strings(s.openQuestions, "Åbne spørgsmål", 12, 600, true), nextStep: { label: text(next.label, "Næste skridt", 1000), expectedAt, sourceIds: refs } };
}
function normalizeUpdate(value: unknown, available: Set<string>): CaseUpdate {
  const u = object(value, "Opdateringen");
  if (!Number.isSafeInteger(u.revision) || Number(u.revision) < 1 || Number(u.revision) > MAX_UPDATES) invalid("Revisionen er ugyldig.");
  if (typeof u.kind !== "string" || !["background", "development", "decision", "schedule", "correction", "resolution"].includes(u.kind)) invalid("Opdateringstypen er ukendt.");
  const normalized: CaseUpdate = { id: id(u.id, "Opdaterings-ID"), revision: Number(u.revision), kind: u.kind as CaseUpdate["kind"], title: text(u.title, "Opdateringstitel", 400), change: text(u.change, "Ændringen", 4000), whyItMatters: text(u.whyItMatters, "Betydningen", 2000), occurredAt: date(u.occurredAt, "Hændelsesdato", true), recordedAt: date(u.recordedAt, "Registreringstid", false, true)!, sourceIds: sourceIds(u.sourceIds, available, "Opdateringens kilder"), snapshot: normalizeSnapshot(u.snapshot, available) };
  if (u.correctsUpdateId !== undefined) normalized.correctsUpdateId = id(u.correctsUpdateId, "Rettet opdaterings-ID");
  if (normalized.kind === "correction" && !normalized.correctsUpdateId) invalid("En rettelse skal pege på den tidligere opdatering.");
  if (normalized.kind !== "correction" && normalized.correctsUpdateId) invalid("Kun rettelser må henvise til en rettet opdatering.");
  if (normalized.kind === "resolution" && normalized.snapshot.status !== "resolved") invalid("En afklaring skal have status afklaret.");
  return normalized;
}
function normalizeCheck(value: unknown, available: Set<string>): CaseCheck {
  const c = object(value, "Kildekontrollen");
  if (typeof c.status !== "string" || !["checked", "partial", "unavailable", "pending_review"].includes(c.status)) invalid("Kildekontrollens status er ukendt.");
  return { checkedAt: date(c.checkedAt, "Kontroltidspunkt", false, true)!, status: c.status as CaseCheck["status"], note: text(c.note, "Kontrolnotat", 2000), sourceIds: sourceIds(c.sourceIds, available, "Kontrollerede kilder", c.status === "unavailable") };
}
function normalizeCase(value: unknown): TrackedCase {
  const c = object(value, "Sagen"), m = object(c.monitoring, "Opfølgningen");
  if (!Array.isArray(c.sources) || !c.sources.length || c.sources.length > MAX_SOURCES) invalid("Sagen skal have et begrænset antal dokumenterede kilder.");
  const sources = c.sources.map(normalizeSource), available = new Set(sources.map(s => s.id));
  if (sources.length !== available.size) invalid("Kilde-ID'er skal være entydige inden for en sag.");
  if (!Array.isArray(c.updates) || !c.updates.length || c.updates.length > MAX_UPDATES) invalid("Sagen skal have en dokumenteret tidslinje.");
  const updates = c.updates.map(u => normalizeUpdate(u, available));
  for (let i = 0; i < updates.length; i++) {
    if (updates[i].revision !== i + 1) invalid("Sagens revisioner skal begynde ved 1 og være fortløbende.");
    if (updates[i].correctsUpdateId && !updates.slice(0, i).some(old => old.id === updates[i].correctsUpdateId)) invalid("Rettelsen henviser ikke til en tidligere opdatering.");
    if (i && Date.parse(updates[i].recordedAt) < Date.parse(updates[i - 1].recordedAt)) invalid("Registreringstider skal følge revisionsrækkefølgen.");
  }
  if (new Set(updates.map(u => u.id)).size !== updates.length) invalid("Opdaterings-ID'er skal være entydige.");
  const topics = strings(c.topics, "Emner", 6, 40);
  if (topics.some(t => !TOPICS.some(known => known.id === t)) || !REGIONS.some(r => r.id === c.region) || typeof c.scope !== "string" || !["local", "national", "global"].includes(c.scope) || typeof c.imageKey !== "string" || !["city", "climate", "mobility"].includes(c.imageKey)) invalid("Sagens emne eller område er ukendt.");
  if (!Number.isSafeInteger(m.reviewEveryHours) || Number(m.reviewEveryHours) < 1 || Number(m.reviewEveryHours) > 720) invalid("Opfølgningsintervallet skal være mellem 1 og 720 timer.");
  return { id: id(c.id, "Sags-ID"), question: text(c.question, "Sagens spørgsmål", 400), description: text(c.description, "Sagens beskrivelse", 2000), topics: topics as TrackedCase["topics"], region: c.region as TrackedCase["region"], scope: c.scope as TrackedCase["scope"], imageKey: c.imageKey as TrackedCase["imageKey"], sources, updates, monitoring: { sourceUrls: strings(m.sourceUrls, "Opfølgningskilder", 30, 2048).map(safeUrl), keywords: strings(m.keywords, "Sagens søgeord", 20, 100), reviewEveryHours: Number(m.reviewEveryHours) }, lastCheck: c.lastCheck === null ? null : normalizeCheck(c.lastCheck, available) };
}
function metadata(c: TrackedCase): CaseMetadata { const { sources: _sources, updates: _updates, lastCheck: _check, ...rest } = c; return rest; }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
async function digest(value: string): Promise<string> {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result), x => x.toString(16).padStart(2, "0")).join("");
}
function chunks<T>(items: T[], size: number): T[][] { return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size)); }
function values(rows: unknown[][]): { sql: string; params: unknown[] } { return { sql: rows.map(row => `(${row.map(() => "?").join(",")})`).join(","), params: rows.flat() }; }
function prepared(db: D1Database, sql: string, params: unknown[]): D1PreparedStatement { return db.prepare(sql).bind(...params); }

/** Catalog initialization is transactional, deterministic, and never overwrites an existing edition. */
export async function ensureCaseCatalog(db: D1Database, catalog: readonly TrackedCase[] = CASE_CATALOG): Promise<void> {
  if (catalog === CASE_CATALOG && INITIALIZED.has(db)) return INITIALIZED.get(db)!;
  const run = async () => {
    if (!catalog.length || catalog.length > MAX_CASES) invalid("Katalogets størrelse er ugyldig.");
    const normalized = catalog.map(normalizeCase);
    if (new Set(normalized.map(c => c.id)).size !== normalized.length) invalid("Sags-ID'er skal være entydige.");
    const existing = await db.prepare("SELECT id, current_revision FROM news_cases").all<{ id: string; current_revision: number }>();
    const initialized = new Set((existing.results || []).filter(c => c.current_revision > 0).map(c => c.id));
    const missing = normalized.filter(c => !initialized.has(c.id));
    if (!missing.length) return;
    const seed = await Promise.all(missing.map(async c => ({ c, json: stable(metadata(c)), hash: await digest(stable(metadata(c))) })));
    const statements: D1PreparedStatement[] = [];
    for (const group of chunks(seed, 20)) {
      const v = values(group.map(({ c, json, hash }) => [c.id, json, hash, 0, c.updates[0].recordedAt]));
      statements.push(prepared(db, `INSERT OR IGNORE INTO news_cases (id, metadata_json, bootstrap_hash, current_revision, created_at) VALUES ${v.sql}`, v.params));
    }
    const sourceRows = seed.flatMap(({ c, hash }) => c.sources.map(s => [c.id, `${c.id}:${s.id}`, s.id, stable(s), hash]));
    for (const group of chunks(sourceRows, 20)) { const v = values(group); statements.push(prepared(db, `WITH incoming(case_id,id,source_id,content_json,seed_hash) AS (VALUES ${v.sql}) INSERT OR IGNORE INTO case_sources (id,case_id,source_id,content_json) SELECT i.id,i.case_id,i.source_id,i.content_json FROM incoming i JOIN news_cases c ON c.id=i.case_id WHERE c.current_revision=0 AND c.bootstrap_hash=i.seed_hash`, v.params)); }
    const updateRows = seed.flatMap(({ c, hash }) => c.updates.map(u => [c.id, `${c.id}:${u.id}`, u.id, u.revision, stable(u), u.recordedAt, hash]));
    for (const group of chunks(updateRows, 14)) { const v = values(group); statements.push(prepared(db, `WITH incoming(case_id,id,update_id,revision,content_json,recorded_at,seed_hash) AS (VALUES ${v.sql}) INSERT OR IGNORE INTO case_updates (id,case_id,update_id,revision,content_json,recorded_at) SELECT i.id,i.case_id,i.update_id,i.revision,i.content_json,i.recorded_at FROM incoming i JOIN news_cases c ON c.id=i.case_id WHERE c.current_revision=0 AND c.bootstrap_hash=i.seed_hash`, v.params)); }
    const checkRows = await Promise.all(seed.filter(({ c }) => c.lastCheck).map(async ({ c, hash }) => { const json = stable(c.lastCheck); return [c.id, await digest(`${c.id}:${json}`), c.lastCheck!.checkedAt, c.lastCheck!.status, json, hash]; }));
    for (const group of chunks(checkRows, 16)) { const v = values(group); statements.push(prepared(db, `WITH incoming(case_id,id,checked_at,status,content_json,seed_hash) AS (VALUES ${v.sql}) INSERT OR IGNORE INTO case_checks (id,case_id,checked_at,status,content_json) SELECT i.id,i.case_id,i.checked_at,i.status,i.content_json FROM incoming i JOIN news_cases c ON c.id=i.case_id WHERE c.current_revision=0 AND c.bootstrap_hash=i.seed_hash`, v.params)); }
    for (const group of chunks(seed, 30)) { const v = values(group.map(({ c, hash }) => [c.id, c.updates.length, hash])); statements.push(prepared(db, `WITH incoming(case_id,revision,seed_hash) AS (VALUES ${v.sql}) UPDATE news_cases SET current_revision=(SELECT i.revision FROM incoming i WHERE i.case_id=news_cases.id) WHERE current_revision=0 AND EXISTS (SELECT 1 FROM incoming i WHERE i.case_id=news_cases.id AND i.seed_hash=news_cases.bootstrap_hash)`, v.params)); }
    await db.batch(statements);
  };
  const promise = run();
  if (catalog === CASE_CATALOG) { INITIALIZED.set(db, promise); promise.catch(() => INITIALIZED.delete(db)); }
  await promise;
}

function assemble(row: MetadataRow, sources: ContentRow[], updates: ContentRow[], checks: ContentRow[]): TrackedCase {
  const result = normalizeCase({ ...JSON.parse(row.metadata_json), sources: sources.filter(s => s.case_id === row.id).map(s => JSON.parse(s.content_json)), updates: updates.filter(u => u.case_id === row.id).map(u => JSON.parse(u.content_json)), lastCheck: checks.find(c => c.case_id === row.id) ? JSON.parse(checks.find(c => c.case_id === row.id)!.content_json) : null });
  if (result.id !== row.id || result.updates.at(-1)?.revision !== row.current_revision) throw new CaseStoreError(503, "history_inconsistent", "Sagens historik kunne ikke kontrolleres.");
  return result;
}

/** One read batch gives a consistent view of metadata, evidence, history and checks. */
export async function readCases(db: D1Database): Promise<TrackedCase[]> {
  const result = await db.batch([
    db.prepare(`SELECT id, metadata_json, current_revision FROM news_cases ORDER BY id LIMIT ${MAX_CASES + 1}`),
    db.prepare(`SELECT case_id, content_json FROM case_sources ORDER BY case_id,source_id LIMIT ${MAX_CASES * MAX_SOURCES + 1}`),
    db.prepare(`SELECT case_id, content_json FROM case_updates ORDER BY case_id,revision LIMIT ${MAX_CASES * MAX_UPDATES + 1}`),
    db.prepare("SELECT case_id, content_json FROM (SELECT case_id,content_json, ROW_NUMBER() OVER (PARTITION BY case_id ORDER BY checked_at DESC,rowid DESC) AS position FROM case_checks) WHERE position=1"),
  ]);
  const rows = (result[0].results || []) as MetadataRow[];
  if (rows.length > MAX_CASES || (result[1].results?.length || 0) > MAX_CASES * MAX_SOURCES || (result[2].results?.length || 0) > MAX_CASES * MAX_UPDATES) throw new CaseStoreError(503, "catalog_capacity", "Sagsarkivet kræver en udvidelse, før det kan vises fuldstændigt.");
  return rows.map(row => assemble(row, result[1].results as ContentRow[], result[2].results as ContentRow[], result[3].results as ContentRow[]));
}

export async function readCase(db: D1Database, caseId: string): Promise<TrackedCase | null> {
  id(caseId, "Sags-ID");
  const result = await db.batch([
    db.prepare("SELECT id, metadata_json, current_revision FROM news_cases WHERE id=?").bind(caseId),
    db.prepare(`SELECT case_id, content_json FROM case_sources WHERE case_id=? ORDER BY source_id LIMIT ${MAX_SOURCES + 1}`).bind(caseId),
    db.prepare(`SELECT case_id, content_json FROM case_updates WHERE case_id=? ORDER BY revision LIMIT ${MAX_UPDATES + 1}`).bind(caseId),
    db.prepare("SELECT case_id, content_json FROM case_checks WHERE case_id=? ORDER BY checked_at DESC,rowid DESC LIMIT 1").bind(caseId),
  ]);
  const row = result[0].results?.[0] as MetadataRow | undefined;
  return row ? assemble(row, result[1].results as ContentRow[], result[2].results as ContentRow[], result[3].results as ContentRow[]) : null;
}

export async function appendCaseUpdate(db: D1Database, input: { caseId: string; expectedRevision: number; update: CaseUpdate; sources?: CaseSource[] }): Promise<{ case: TrackedCase; update: CaseUpdate; idempotent: boolean }> {
  const current = await readCase(db, input.caseId);
  if (!current) throw new CaseStoreError(404, "case_not_found", "Sagen findes ikke.");
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) invalid("Den forventede revision er ugyldig.");
  if (input.sources !== undefined && (!Array.isArray(input.sources) || input.sources.length > 30)) invalid("For mange nye kilder.");
  const sources = (input.sources || []).map(normalizeSource);
  if (new Set(sources.map(s => s.id)).size !== sources.length) invalid("De nye kilde-ID'er skal være entydige.");
  const approvedHosts = new Set([...current.sources.map(s => s.url), ...current.monitoring.sourceUrls].map(url => new URL(url).hostname));
  for (const source of sources) {
    if (!approvedHosts.has(new URL(source.url).hostname)) invalid("Kilden ligger uden for sagens godkendte kildeværter.");
    const previous = current.sources.find(s => s.id === source.id);
    if (previous && stable(previous) !== stable(source)) conflict("En tidligere kildeversion må ikke overskrives. Brug et nyt kilde-ID.");
  }
  const available = new Set([...current.sources, ...sources].map(s => s.id));
  if (available.size > MAX_SOURCES) throw new CaseStoreError(409, "source_capacity", "Sagens kildearkiv kræver en udvidelse.");
  const update = normalizeUpdate(input.update, available), content = stable(update);
  const previous = current.updates.find(u => u.id === update.id);
  if (previous) {
    if (stable(previous) !== content) conflict("Opdaterings-ID'et findes allerede med andet indhold.");
    return { case: current, update: previous, idempotent: true };
  }
  const latest = current.updates.at(-1)!;
  if (latest.revision !== input.expectedRevision || update.revision !== latest.revision + 1) conflict("Sagen har ændret sig. Læs den seneste revision, før du publicerer.");
  if (Date.parse(update.recordedAt) < Date.parse(latest.recordedAt) || Date.parse(update.recordedAt) > Date.now() + 5 * 60_000) invalid("Registreringstidspunktet skal være aktuelt og følge den seneste revision.");
  if (update.correctsUpdateId && !current.updates.some(u => u.id === update.correctsUpdateId)) invalid("Rettelsen skal henvise til en eksisterende opdatering i denne sag.");
  if (update.kind === "background") invalid("Nye udgaver efter sagens start skal beskrive en konkret udvikling.");
  const sameMeaning = current.updates.some(u => u.kind === update.kind && u.change === update.change && u.title === update.title && stable(u.snapshot) === stable(update.snapshot));
  if (sameMeaning) conflict("Denne sagsudvikling er allerede registreret.");
  const internalId = `${current.id}:${update.id}`;
  const statements = [db.prepare("INSERT INTO case_updates (id,case_id,update_id,revision,content_json,recorded_at) SELECT ?,?,?,?,?,? FROM news_cases WHERE id=? AND current_revision=? ON CONFLICT(id) DO NOTHING").bind(internalId, current.id, update.id, update.revision, content, update.recordedAt, current.id, input.expectedRevision)];
  for (const source of sources) statements.push(db.prepare("INSERT INTO case_sources (id,case_id,source_id,content_json) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM case_updates WHERE id=? AND content_json=?) ON CONFLICT(case_id,source_id) DO UPDATE SET content_json=CASE WHEN case_sources.content_json=excluded.content_json THEN case_sources.content_json ELSE NULL END").bind(`${current.id}:${source.id}`, current.id, source.id, stable(source), internalId, content));
  statements.push(db.prepare("UPDATE news_cases SET current_revision=? WHERE id=? AND current_revision=? AND EXISTS (SELECT 1 FROM case_updates WHERE id=? AND content_json=?)").bind(update.revision, current.id, input.expectedRevision, internalId, content));
  await db.batch(statements);
  const saved = await readCase(db, current.id);
  const savedUpdate = saved?.updates.find(u => u.id === update.id);
  if (!saved || !savedUpdate || stable(savedUpdate) !== content) conflict("En anden opdatering kom først. Læs sagen igen.");
  return { case: saved, update: savedUpdate, idempotent: false };
}

export async function recordCaseCheck(db: D1Database, input: { caseId: string; check: CaseCheck }): Promise<{ check: CaseCheck; idempotent: boolean }> {
  const current = await readCase(db, input.caseId);
  if (!current) throw new CaseStoreError(404, "case_not_found", "Sagen findes ikke.");
  const check = normalizeCheck(input.check, new Set(current.sources.map(s => s.id)));
  if (Date.parse(check.checkedAt) > Date.now() + 5 * 60_000) invalid("Kontroltidspunktet må ikke ligge i fremtiden.");
  const json = stable(check), key = await digest(`${current.id}:${json}`);
  const result = await db.prepare("INSERT OR IGNORE INTO case_checks (id,case_id,checked_at,status,content_json) VALUES (?,?,?,?,?)").bind(key, current.id, check.checkedAt, check.status, json).run();
  return { check, idempotent: (result.meta.changes || 0) === 0 };
}

export async function readEditorialQueue(db: D1Database, nowIso = new Date().toISOString()) {
  const now = Date.parse(date(nowIso, "Aktuelt tidspunkt", false, true)!);
  return (await readCases(db)).map(c => {
    const latest = c.updates.at(-1)!;
    const previous = Date.parse(c.lastCheck?.checkedAt || latest.recordedAt);
    const routineDue = previous + c.monitoring.reviewEveryHours * 3_600_000;
    // A known milestone can bring a review forward; a passed milestone never changes the case status itself.
    const milestone = latest.snapshot.nextStep.expectedAt ? Date.parse(latest.snapshot.nextStep.expectedAt) : NaN;
    const due = Number.isFinite(milestone) && milestone > previous ? Math.min(routineDue, milestone) : routineDue;
    return { caseId: c.id, question: c.question, revision: latest.revision, status: latest.snapshot.status, lastCheck: c.lastCheck, nextStep: latest.snapshot.nextStep, sourceUrls: c.monitoring.sourceUrls, sourceIds: c.sources.map(s => s.id), dueAt: new Date(due).toISOString(), isDue: due <= now };
  }).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}
