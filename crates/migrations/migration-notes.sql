BEGIN TRANSACTION;
PRAGMA foreign_keys = OFF;
-- We must convert all of Prisma's lookup tables to be something more readable:
-- _LibraryToUser -> library_exclusions
-- _LibraryToTag -> library_tags
-- _MediaToTag -> _media_to_tag
-- _SeriesToTag -> _series_to_tag
CREATE TABLE "library_exclusions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "library_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "library_exclusions_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "library_exclusions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "library_exclusions"("library_id", "user_id")
SELECT "A",
    "B"
FROM "_LibraryToUser";
DROP TABLE "_LibraryToUser";
CREATE TABLE "library_tags" (
    "library_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "library_tag_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "library_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "library_tags"("library_id", "tag_id")
SELECT "A",
    "B"
FROM "_LibraryToTag";
DROP TABLE "_LibraryToTag";
CREATE TABLE "_media_to_tag" (
    "media_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "_media_to_tag_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_media_to_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "_media_to_tag"("media_id", "tag_id")
SELECT "A",
    "B"
FROM "_MediaToTag";
DROP TABLE "_MediaToTag";
CREATE TABLE "_series_to_tag" (
    "series_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "_series_to_tag_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_series_to_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "_series_to_tag"("series_id", "tag_id")
SELECT "A",
    "B"
FROM "_SeriesToTag";
DROP TABLE "_SeriesToTag";
-- The next step is to convert the tag ID to be an autoincrementing integer, but
-- we need to try and preserve the existing links to the entities:
-- A temporary mapping table to track old tag IDs to new ones
CREATE TABLE "_tag_id_map" (
    "old_id" TEXT NOT NULL,
    "new_id" INTEGER NOT NULL,
    PRIMARY KEY ("old_id")
);
-- A new tags table with an autoincrementing integer ID
CREATE TABLE "new_tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Insert the existing tags into the new table
INSERT INTO "new_tags" ("name", "created_at")
SELECT "name",
    "created_at"
FROM "tags";
-- Step 4: Create a mapping of old tag IDs to new tag IDs
INSERT INTO "_tag_id_map" ("old_id", "new_id")
SELECT t_old."id",
    t_new."id"
FROM "tags" t_old
    JOIN "new_tags" t_new ON t_old."name" = t_new."name";
-- We need to redefine the relationship tables to use the new integer IDs:
-- Update the media mapping
CREATE TABLE "new_media_to_tag" (
    "media_id" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,
    CONSTRAINT "_media_to_tag_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_media_to_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_to_tag" ("media_id", "tag_id")
SELECT mtg."media_id",
    map."new_id"
FROM "_media_to_tag" mtg
    JOIN "_tag_id_map" map ON mtg."tag_id" = map."old_id";
-- Update the series mapping
CREATE TABLE "new_series_to_tag" (
    "series_id" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,
    CONSTRAINT "_series_to_tag_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_series_to_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_series_to_tag" ("series_id", "tag_id")
SELECT stg."series_id",
    map."new_id"
FROM "_series_to_tag" stg
    JOIN "_tag_id_map" map ON stg."tag_id" = map."old_id";
-- Update the library mapping
CREATE TABLE "newlibrary_tag" (
    "library_id" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,
    CONSTRAINT "library_tag_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "library_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "newlibrary_tag" ("library_id", "tag_id")
SELECT ltg."library_id",
    map."new_id"
FROM "library_tags" ltg
    JOIN "_tag_id_map" map ON ltg."tag_id" = map."old_id";
-- At this point, we should be good to drop the old tables and rename the new ones:
DROP TABLE "_media_to_tag";
DROP TABLE "_series_to_tag";
DROP TABLE "library_tags";
DROP TABLE "tags";
-- Step 10: Rename new tables
ALTER TABLE "new_media_to_tag"
    RENAME TO "_media_to_tag";
ALTER TABLE "new_series_to_tag"
    RENAME TO "_series_to_tag";
ALTER TABLE "newlibrary_tag"
    RENAME TO "library_tags";
ALTER TABLE "new_tags"
    RENAME TO "tags";
-- And drop the temporary mapping table
DROP TABLE "_tag_id_map";
CREATE TABLE "scheduled_job_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "description" TEXT,
    "interval_secs" INTEGER NOT NULL DEFAULT 3600,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE _scheduled_job_library (
    "library_id" TEXT NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    CONSTRAINT "_scheduled_job_library_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_scheduled_job_library_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "scheduled_job_configs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Prisma seemed to handle some non-nullable cols strangely (e.g., like setting `updated_at` on insert) _without_ default values on the column. So we need to adjust those:
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "extension" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" DATETIME,
    "hash" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "series_id" TEXT,
    "deleted_at" DATETIME,
    "koreader_hash" TEXT,
    CONSTRAINT "media_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media"(
        "id",
        "name",
        "size",
        "extension",
        "pages",
        "updated_at",
        "created_at",
        "modified_at",
        "hash",
        "path",
        "status",
        "series_id",
        "deleted_at",
        "koreader_hash"
    )
SELECT "id",
    "name",
    "size",
    "extension",
    "pages",
    "updated_at",
    "created_at",
    "modified_at",
    "hash",
    "path",
    "status",
    "series_id",
    "deleted_at",
    "koreader_hash"
FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media"
    RENAME TO "media";
-- We don't need UUIDs for metadata:
CREATE TABLE "new_media_metadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "series" TEXT,
    "number" REAL,
    "volume" INTEGER,
    "summary" TEXT,
    "notes" TEXT,
    "genre" TEXT,
    "year" INTEGER,
    "month" INTEGER,
    "day" INTEGER,
    "writers" TEXT,
    "pencillers" TEXT,
    "inkers" TEXT,
    "colorists" TEXT,
    "letterers" TEXT,
    "cover_artists" TEXT,
    "editors" TEXT,
    "publisher" TEXT,
    "links" TEXT,
    "characters" TEXT,
    "teams" TEXT,
    "page_count" INTEGER,
    "media_id" TEXT,
    "age_rating" INTEGER,
    "page_analysis" TEXT,
    CONSTRAINT "media_metadata_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_metadata"(
        "title",
        "series",
        "number",
        "volume",
        "summary",
        "notes",
        "genre",
        "year",
        "month",
        "day",
        "writers",
        "pencillers",
        "inkers",
        "colorists",
        "letterers",
        "cover_artists",
        "editors",
        "publisher",
        "links",
        "characters",
        "teams",
        "page_count",
        "media_id",
        "age_rating"
    )
SELECT "title",
    "series",
    "number",
    "volume",
    "summary",
    "notes",
    "genre",
    "year",
    "month",
    "day",
    "writers",
    "pencillers",
    "inkers",
    "colorists",
    "letterers",
    "cover_artists",
    "editors",
    "publisher",
    "links",
    "characters",
    "teams",
    "page_count",
    "media_id",
    "age_rating"
FROM "media_metadata";
-- TODO: We need to figure out how to handle the page_analysis column
DROP TABLE "media_metadata";
ALTER TABLE "new_media_metadata"
    RENAME TO "media_metadata";
-- Changes:
-- 1. id is now an autoincrementing integer
CREATE TABLE "new_library_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "convert_rar_to_zip" BOOLEAN NOT NULL DEFAULT false,
    "hard_delete_conversions" BOOLEAN NOT NULL DEFAULT false,
    "default_reading_dir" TEXT NOT NULL DEFAULT 'ltr',
    "default_reading_mode" TEXT NOT NULL DEFAULT 'paged',
    "default_reading_image_scale_fit" TEXT NOT NULL DEFAULT 'height',
    "generate_file_hashes" BOOLEAN NOT NULL DEFAULT false,
    "generate_koreader_hashes" BOOLEAN NOT NULL DEFAULT false,
    "process_metadata" BOOLEAN NOT NULL DEFAULT true,
    "library_pattern" TEXT NOT NULL DEFAULT 'SERIES_BASED',
    "thumbnail_config" BLOB,
    "ignore_rules" BLOB,
    "library_id" TEXT,
    "watch" BOOLEAN DEFAULT TRUE
);
INSERT INTO "new_library_configs"(
        "convert_rar_to_zip",
        "hard_delete_conversions",
        "default_reading_dir",
        "default_reading_mode",
        "default_reading_image_scale_fit",
        "generate_file_hashes",
        "generate_koreader_hashes",
        "process_metadata",
        "library_pattern",
        "library_id"
    )
SELECT "convert_rar_to_zip",
    "hard_delete_conversions",
    "default_reading_dir",
    "default_reading_mode",
    "default_reading_image_scale_fit",
    "generate_file_hashes",
    "generate_koreader_hashes",
    "process_metadata",
    "library_pattern",
    "library_id"
FROM "library_configs";
DROP TABLE "library_configs";
ALTER TABLE "new_library_configs"
    RENAME TO "library_configs";
-- Changes:
-- 1. updated_at column default to current timestamp
-- 2. config_id is now non-nullable integer
CREATE TABLE "new_libraries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emoji" TEXT,
    "config_id" INTEGER NOT NULL,
    "last_scanned_at" DATETIME,
    CONSTRAINT "libraries_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "library_configs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_libraries"(
        "id",
        "name",
        "description",
        "path",
        "status",
        "updated_at",
        "created_at",
        "emoji",
        "config_id",
        "last_scanned_at"
    )
SELECT "id",
    "name",
    "description",
    "path",
    "status",
    "updated_at",
    "created_at",
    "emoji",
    "config_id",
    "last_scanned_at"
FROM "libraries";
DROP TABLE "libraries";
ALTER TABLE "new_libraries"
    RENAME TO "libraries";
-- Changes:
-- 1. updated_at column default to current timestamp
CREATE TABLE "new_series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "library_id" TEXT,
    CONSTRAINT "series_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_series"(
        "id",
        "name",
        "description",
        "updated_at",
        "created_at",
        "path",
        "status",
        "library_id"
    )
SELECT "id",
    "name",
    "description",
    "updated_at",
    "created_at",
    "path",
    "status",
    "library_id"
FROM "series";
DROP TABLE "series";
ALTER TABLE "new_series"
    RENAME TO "series";
-- TODO: book club schedule (and possibly others) id
-- Changes:
-- 1. id is now an autoincrementing integer
CREATE TABLE "new_user_login_activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "authentication_successful" BOOLEAN NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "user_login_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_login_activity"(
        "ip_address",
        "user_agent",
        "authentication_successful",
        "timestamp",
        "user_id"
    )
SELECT "ip_address",
    "user_agent",
    "authentication_successful",
    "timestamp",
    "user_id"
FROM "user_login_activity";
DROP TABLE "user_login_activity";
ALTER TABLE "new_user_login_activity"
    RENAME TO "user_login_activity";
-- Changes:
-- 1. id is now an autoincrementing integer
CREATE TABLE "new_age_restrictions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "age" INTEGER NOT NULL,
    "restrict_on_unset" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "age_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_age_restrictions"(
        "age",
        "restrict_on_unset",
        "user_id"
    )
SELECT "age",
    "restrict_on_unset",
    "user_id"
FROM "age_restrictions";
DROP TABLE "age_restrictions";
ALTER TABLE "new_age_restrictions"
    RENAME TO "age_restrictions";
-- Changes:
-- 1. id is now an autoincrementing integer
-- 2. updated_at column default to current timestamp
-- 3. unique constraint on user_id and media_id
CREATE TABLE "new_reading_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "page" INTEGER,
    "percentage_completed" REAL,
    "epubcfi" TEXT,
    "koreader_progress" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    "elapsed_seconds" BIGINT,
    CONSTRAINT "reading_sessions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reading_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "registered_reading_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT user_media_unique UNIQUE (user_id, media_id)
);
INSERT INTO "new_reading_sessions"(
        "page",
        "percentage_completed",
        "epubcfi",
        "koreader_progress",
        "started_at",
        "updated_at",
        "media_id",
        "user_id",
        "device_id",
        "elapsed_seconds"
    )
SELECT "page",
    "percentage_completed",
    "epubcfi",
    "koreader_progress",
    "started_at",
    "updated_at",
    "media_id",
    "user_id",
    "device_id",
    "elapsed_seconds"
FROM "reading_sessions";
DROP TABLE "reading_sessions";
ALTER TABLE "new_reading_sessions"
    RENAME TO "reading_sessions";
CREATE UNIQUE INDEX IF NOT EXISTS "reading_sessions_user_id_media_id_key" ON "reading_sessions" ("user_id", "media_id");
-- Changes:
-- 1. id is now an autoincrementing integer
CREATE TABLE "new_finshed_reading_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    "elapsed_seconds" BIGINT,
    CONSTRAINT "finished_reading_sessions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "finished_reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "finished_reading_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "registered_reading_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_finshed_reading_sessions"(
        "started_at",
        "completed_at",
        "media_id",
        "user_id",
        "device_id",
        "elapsed_seconds"
    )
SELECT "started_at",
    "completed_at",
    "media_id",
    "user_id",
    "device_id",
    "elapsed_seconds"
FROM "finished_reading_sessions";
DROP TABLE "finished_reading_sessions";
ALTER TABLE "new_finshed_reading_sessions"
    RENAME TO "finished_reading_sessions";
-- Changes:
-- 1. Add id as an autoincrementing integer
CREATE TABLE "new_last_library_visits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "last_library_visit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "last_library_visit_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_last_library_visits"(
        "user_id",
        "library_id",
        "timestamp"
    )
SELECT "user_id",
    "library_id",
    "timestamp"
FROM "last_library_visits";
DROP TABLE "last_library_visits";
ALTER TABLE "new_last_library_visits"
    RENAME TO "last_library_visits";
-- Changes:
-- 1. id is now an autoincrementing integer to smart_list_views
CREATE TABLE temp_smart_list_views (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    list_id TEXT NOT NULL,
    data BLOB NOT NULL,
    CONSTRAINT smart_list_views_list_id_fkey FOREIGN KEY (list_id) REFERENCES smart_lists(id) ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO temp_smart_list_views(name, list_id, data)
SELECT name,
    list_id,
    data
FROM smart_list_views;
DROP TABLE smart_list_views;
ALTER TABLE temp_smart_list_views
    RENAME TO smart_list_views;
PRAGMA foreign_keys = ON;
COMMIT;