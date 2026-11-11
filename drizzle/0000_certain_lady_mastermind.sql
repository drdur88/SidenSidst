CREATE TABLE `beta_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`clarity` integer NOT NULL,
	`would_return` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`story_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `beta_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`consent_at` text NOT NULL,
	`consent_version` text NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`interests_json` text DEFAULT '[]' NOT NULL,
	`manage_token_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beta_subscriptions_email_unique` ON `beta_subscriptions` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `beta_subscriptions_manage_token_hash_unique` ON `beta_subscriptions` (`manage_token_hash`);