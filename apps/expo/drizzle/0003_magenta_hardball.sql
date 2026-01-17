CREATE TABLE `annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`server_id` text NOT NULL,
	`locator` text NOT NULL,
	`annotation_text` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'UNSYNCED' NOT NULL,
	`server_annotation_id` text,
	`deleted_at` integer,
	FOREIGN KEY (`book_id`) REFERENCES `downloaded_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bookmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`server_id` text NOT NULL,
	`epubcfi` text,
	`href` text NOT NULL,
	`chapter_title` text,
	`locations` text,
	`preview_content` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'UNSYNCED' NOT NULL,
	`server_bookmark_id` text,
	`deleted_at` integer,
	FOREIGN KEY (`book_id`) REFERENCES `downloaded_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_bookmarks`("book_id", "server_id", "epubcfi", "href", "chapter_title", "locations", "preview_content", "created_at", "updated_at", "sync_status", "server_bookmark_id", "deleted_at") SELECT "book_id", "server_id", "epubcfi", "href", "chapter_title", "locations", "preview_content", "created_at", "updated_at", "sync_status", "server_bookmark_id", "deleted_at" FROM `bookmarks`;--> statement-breakpoint
DROP TABLE `bookmarks`;--> statement-breakpoint
ALTER TABLE `__new_bookmarks` RENAME TO `bookmarks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;