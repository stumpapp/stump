CREATE TABLE `downloaded_files` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`server_id` text NOT NULL,
	`size` integer,
	`downloaded_at` integer NOT NULL,
	`book_name` text,
	`book_description` text,
	`book_metadata` text,
	`series_id` text
);
--> statement-breakpoint
CREATE TABLE `library_refs` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `series_refs` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` text NOT NULL,
	`name` text NOT NULL,
	`library_id` text
);
--> statement-breakpoint
CREATE TABLE `unsynced_read_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`server_id` text NOT NULL,
	`page` integer,
	`epub_progress` text,
	`elapsed_seconds` integer,
	`percentage` text,
	`last_modified` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `downloaded_files`(`id`) ON UPDATE no action ON DELETE cascade
);
