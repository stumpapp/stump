CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`server_id` text NOT NULL,
	`epubcfi` text,
	`href` text NOT NULL,
	`chapter_title` text,
	`locations` text,
	`preview_content` text,
	`created_at` integer NOT NULL,
	`sync_status` text DEFAULT 'UNSYNCED' NOT NULL,
	`server_bookmark_id` text,
	FOREIGN KEY (`book_id`) REFERENCES `downloaded_files`(`id`) ON UPDATE no action ON DELETE cascade
);