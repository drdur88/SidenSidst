CREATE TABLE `case_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`checked_at` text NOT NULL,
	`status` text NOT NULL,
	`content_json` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `news_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `case_checks_case_time_idx` ON `case_checks` (`case_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `case_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`source_id` text NOT NULL,
	`content_json` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `news_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_sources_case_source_unique` ON `case_sources` (`case_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `case_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`update_id` text NOT NULL,
	`revision` integer NOT NULL,
	`content_json` text NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `news_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_updates_case_revision_unique` ON `case_updates` (`case_id`,`revision`);--> statement-breakpoint
CREATE UNIQUE INDEX `case_updates_case_update_unique` ON `case_updates` (`case_id`,`update_id`);--> statement-breakpoint
CREATE TABLE `news_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`metadata_json` text NOT NULL,
	`bootstrap_hash` text NOT NULL,
	`current_revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
