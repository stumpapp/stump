CREATE TABLE IF NOT EXISTS `user` (
  `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  `username` text NOT NULL UNIQUE,
  `password` text NOT NULL
);

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

CREATE TABLE IF NOT EXISTS `read_progress` (
  `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  `media_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `page` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  FOREIGN KEY (`media_id`) REFERENCES `media` (`id`),
  UNIQUE(`media_id`,`user_id`)
);

CREATE TABLE IF NOT EXISTS `logs` (
  `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  `level` text NOT NULL,
  `message` text NOT NULL UNIQUE,
  `created_at` text NOT NULL
);