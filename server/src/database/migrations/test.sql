DROP TABLE read_progress;
DROP TABLE `user`;

CREATE TABLE IF NOT EXISTS `user` (
  `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  `username` text NOT NULL UNIQUE,
  `password` text NOT NULL,
  "role" text NOT NULL DEFAULT 'member'
);

CREATE TABLE IF NOT EXISTS "read_progress" (
  "media_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "page" integer NOT NULL,
  CONSTRAINT "pk-read_progress" PRIMARY KEY ("media_id", "user_id"),
  FOREIGN KEY ("user_id") REFERENCES "user" ("id"),
  FOREIGN KEY ("media_id") REFERENCES "media" ("id")
);

INSERT INTO `user` (username, password, role) VALUES ("oromei", "test", "owner");
INSERT INTO `user` (username, password) VALUES ("otherUser", "test");

-- 1 is oromei
-- 2 is otherUser

-- 1 is Venom
-- 2 is Spider-Man
-- 3 is The Hobbit

-- oromei reads 5 pages of venom
-- otherUser reads 10 pages of venom
-- If I try and insert another oromei venom it SHOULD error
-- oromei should be able to read Spider-Man without error
INSERT INTO `read_progress` (media_id, user_id, page) VALUES (1, 1, 5);
INSERT INTO `read_progress` (media_id, user_id, page) VALUES (1, 2, 10);
-- should error here
INSERT INTO `read_progress` (media_id, user_id, page) VALUES (1, 1, 15);
-- should *not* error here
INSERT INTO `read_progress` (media_id, user_id, page) VALUES (2, 1, 20);