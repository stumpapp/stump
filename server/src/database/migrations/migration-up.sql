CREATE TABLE IF NOT EXISTS `library` (
    `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    `name` text NOT NULL,
    `path` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `series` (
  `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  `library_id` integer NOT NULL,
  `title` text NOT NULL,
  `book_count` integer NOT NULL,
  `updated_at` text NOT NULL,
  `path` text NOT NULL,
  FOREIGN KEY (`library_id`) REFERENCES `library` (`id`)
);

CREATE TABLE IF NOT EXISTS `media` (
  `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  `series_id` integer NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `size` integer NOT NULL,
  `extension` text NOT NULL,
  `pages` integer NOT NULL,
  `updated_at` text,
  `downloaded` integer NOT NULL,
  `checksum` text NOT NULL,
  `path` text NOT NULL,
  FOREIGN KEY (`series_id`) REFERENCES `series` (`id`)
);