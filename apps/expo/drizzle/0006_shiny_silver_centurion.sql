ALTER TABLE `read_progress` ADD `last_pulled_session_updated_at` integer;--> statement-breakpoint
ALTER TABLE `read_progress` ADD `pending_reset` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `read_progress` ADD `last_synced_session_id` integer;