import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// Registrations are unverified expressions of interest, not accounts.
export const subscriptions = sqliteTable("beta_subscriptions", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull(),
  consentAt: text("consent_at").notNull(),
  consentVersion: text("consent_version").notNull(),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  interests: text("interests_json").notNull().default("[]"),
  tokenHash: text("manage_token_hash").notNull().unique(),
});

export const feedback = sqliteTable("beta_feedback", {
  id: text("id").primaryKey(),
  clarity: integer("clarity").notNull(),
  wouldReturn: text("would_return").notNull(),
  comment: text("comment").notNull().default(""),
  storyId: text("story_id"),
  createdAt: text("created_at").notNull(),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
});

// Public editorial case records. Personal reading positions stay on the guest's
// device; the email waitlist is deliberately not an authentication identity.
export const newsCases = sqliteTable("news_cases", {
  id: text("id").primaryKey(),
  metadataJson: text("metadata_json").notNull(),
  bootstrapHash: text("bootstrap_hash").notNull(),
  currentRevision: integer("current_revision").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const caseSources = sqliteTable("case_sources", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => newsCases.id),
  sourceId: text("source_id").notNull(),
  contentJson: text("content_json").notNull(),
}, (table) => [uniqueIndex("case_sources_case_source_unique").on(table.caseId, table.sourceId)]);

export const caseUpdates = sqliteTable("case_updates", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => newsCases.id),
  updateId: text("update_id").notNull(),
  revision: integer("revision").notNull(),
  contentJson: text("content_json").notNull(),
  recordedAt: text("recorded_at").notNull(),
}, (table) => [
  uniqueIndex("case_updates_case_revision_unique").on(table.caseId, table.revision),
  uniqueIndex("case_updates_case_update_unique").on(table.caseId, table.updateId),
]);

export const caseChecks = sqliteTable("case_checks", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => newsCases.id),
  checkedAt: text("checked_at").notNull(),
  status: text("status").notNull(),
  contentJson: text("content_json").notNull(),
}, (table) => [index("case_checks_case_time_idx").on(table.caseId, table.checkedAt)]);
