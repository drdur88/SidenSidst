import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
