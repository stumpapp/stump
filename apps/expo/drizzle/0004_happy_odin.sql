CREATE TABLE `download_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`server_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`download_url` text NOT NULL,
	`filename` text NOT NULL,
	`extension` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`failure_reason` text
);
