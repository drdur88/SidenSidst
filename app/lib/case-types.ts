import type { TopicId, RegionId, NewsScope } from "./news-types";

export type CaseStatus = "active" | "awaiting" | "resolved";
export type CaseUpdateKind = "background" | "development" | "decision" | "schedule" | "correction" | "resolution";
export type CaseCheckStatus = "checked" | "partial" | "unavailable" | "pending_review";

export interface CaseSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  checkedAt: string;
  /** An original, concise description of what this source supports. */
  evidence: string;
}

export interface CaseNextStep {
  label: string;
  /** An announced date, never an inferred completion date. */
  expectedAt: string | null;
  sourceIds: string[];
}

export interface CaseSnapshot {
  status: CaseStatus;
  answer: string;
  openQuestions: string[];
  nextStep: CaseNextStep;
}

export interface CaseUpdate {
  id: string;
  revision: number;
  kind: CaseUpdateKind;
  title: string;
  change: string;
  whyItMatters: string;
  /** When the real event occurred (or was announced); separate from discovery. */
  occurredAt: string | null;
  /** When this edition was reviewed and recorded by Siden sidst. */
  recordedAt: string;
  sourceIds: string[];
  snapshot: CaseSnapshot;
  correctsUpdateId?: string;
}

export interface CaseCheck {
  checkedAt: string;
  status: CaseCheckStatus;
  note: string;
  sourceIds: string[];
}

export interface TrackedCase {
  id: string;
  question: string;
  description: string;
  topics: TopicId[];
  region: RegionId;
  scope: NewsScope;
  imageKey: "city" | "climate" | "mobility";
  sources: CaseSource[];
  /** Append-only editorial editions, ordered by increasing revision. */
  updates: CaseUpdate[];
  monitoring: {
    sourceUrls: string[];
    keywords: string[];
    reviewEveryHours: number;
  };
  lastCheck: CaseCheck | null;
}

export interface CasesResponse {
  cases: TrackedCase[];
  generatedAt: string;
  storage: "database" | "catalog";
  monitoring: {
    state: "scheduled" | "manual";
    label: string;
  };
}

export interface CaseProgress {
  followedAt: string;
  followedRevision: number;
  acknowledgedRevision: number;
  seenRevision: number;
  openedRevision: number;
  priority: "normal" | "high";
  paused: boolean;
}

export interface CaseReader {
  version: 1;
  cases: Record<string, CaseProgress>;
}

export const EMPTY_CASE_READER: CaseReader = { version: 1, cases: {} };
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  active: "I udvikling", awaiting: "Afventer næste skridt", resolved: "Spørgsmålet er afklaret",
};
export const CASE_KIND_LABELS: Record<CaseUpdateKind, string> = {
  background: "Udgangspunkt", development: "Ny udvikling", decision: "Beslutning",
  schedule: "Tidsplan", correction: "Rettelse", resolution: "Afklaring",
};
