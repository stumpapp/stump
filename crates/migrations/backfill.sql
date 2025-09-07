-- This SQL file is used to 'fix' the data in the database after the migration. BE SURE TO BACKUP BEFORE UPDATING:

-- 1. open the newly migrated database in your preferred SQLite client, I use TablePlus but it doesn't matter. You may also use the CLI e.g. sqlite3 stump.db < resolve-missing-data.sql
--    you must use absolute paths to the databases, replace with your path
ATTACH DATABASE '/replace/with/full/path/to/stump-before-migration.db' as 'backup';

-- 2. run the following SQL to copy the data from the old database to the new database:
BEGIN;
PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

-- Libraries which users cannot access via explicit join record
INSERT INTO "library_exclusions"("library_id", "user_id")
SELECT "A",
    "B"
FROM backup."_LibraryToUser";

-- Backfilling the tags will be a bit of a dance. The big thing to consider is that the 
-- new definition uses auto-incrementing integers as the ID, but all the existing mappings
-- use the old string IDs:

-- Step 1: A temporary mapping table to track old tag IDs to new ones
CREATE TABLE "tag_id_map" (
    "old_id" TEXT NOT NULL,
    "new_id" INTEGER NOT NULL,
    PRIMARY KEY ("old_id")
);

-- Step 2: Insert the existing tags from backup into the new database
INSERT INTO "tags" ("name")
SELECT "name"
FROM backup."tags";

-- Step 3: Create a mapping of old tag IDs to new tag IDs
INSERT INTO "tag_id_map" ("old_id", "new_id")
SELECT t_old."id",
    t_new."id"
FROM backup."tags" t_old
    JOIN "tags" t_new ON t_old."name" = t_new."name";

-- Step 4: Backfill all the tag-related join tables using the mapping table

-- Media tags
INSERT INTO "media_tags" ("media_id", "tag_id")
SELECT mtg."A",
    map."new_id"
FROM backup."_MediaToTag" mtg
    JOIN "tag_id_map" map ON mtg."B" = map."old_id";

-- Series tags
INSERT INTO "series_tags" ("series_id", "tag_id")
SELECT stg."A",
    map."new_id"
FROM backup."_SeriesToTag" stg
    JOIN "tag_id_map" map ON stg."B" = map."old_id";

-- Library tags
INSERT INTO "library_tags" ("library_id", "tag_id")
SELECT ltg."A",
    map."new_id"
FROM backup."_LibraryToTag" ltg
    JOIN "tag_id_map" map ON ltg."B" = map."old_id";

-- Step 5: Clean up the temporary mapping table. We should be done at this point with tags
DROP TABLE "tag_id_map";

-- Backfill the library and library-related tables:
-- Library configs now use auto-incrementing integer IDs, so we need mapping like user preferences

-- Step 1: Create a temporary mapping table for library config IDs
CREATE TABLE "library_config_id_map" (
    "old_id" TEXT NOT NULL,
    "new_id" INTEGER NOT NULL,
    PRIMARY KEY ("old_id")
);

-- Step 2: Insert library configs with new auto-increment IDs (excluding the old text ID)
-- Note: Can't backfill default_reading_mode
INSERT INTO "library_configs"(
        "convert_rar_to_zip",
        "hard_delete_conversions",
        "default_reading_dir",
        "default_reading_mode",
        "default_reading_image_scale_fit",
        "generate_file_hashes",
        "generate_koreader_hashes",
        "process_metadata",
        "library_pattern",
        "watch",
        "library_id"
    )
SELECT "convert_rar_to_zip",
    "hard_delete_conversions",
    UPPER("default_reading_dir"),
    'PAGED',
    UPPER("default_reading_image_scale_fit"),
    "generate_file_hashes",
    "generate_koreader_hashes",
    "process_metadata",
    "library_pattern",
    "watch",
    "library_id"
FROM backup."library_configs";

-- Step 3: Create mapping of old library config IDs to new ones by insertion order
INSERT INTO "library_config_id_map" ("old_id", "new_id")
SELECT lc_old."id",
    lc_new."id"
FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") as rn
    FROM backup."library_configs"
) lc_old
JOIN (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") as rn
    FROM "library_configs"
) lc_new ON lc_old.rn = lc_new.rn;

-- Step 4: Insert libraries with mapped config_id
INSERT INTO "libraries"(
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
    UPPER("status"),
    datetime("updated_at"/1000, 'unixepoch'),
    datetime("created_at"/1000, 'unixepoch'),
    "emoji",
    map."new_id", -- Use mapped config_id
    CASE WHEN "last_scanned_at" IS NOT NULL THEN datetime("last_scanned_at"/1000, 'unixepoch') ELSE NULL END
FROM backup."libraries" lib
JOIN "library_config_id_map" map ON lib."config_id" = map."old_id";

-- Step 5: Clean up the library config mapping table
DROP TABLE "library_config_id_map";

-- Backfill the series and series metadata tables:

INSERT INTO "series"(
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
    datetime("updated_at"/1000, 'unixepoch'),
    datetime("created_at"/1000, 'unixepoch'),
    "path",
    UPPER("status"),
    "library_id"
FROM backup."series";
-- TODO: metadata

-- Backfill the media and media metadata tables:

INSERT INTO "media"(
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
    datetime("updated_at"/1000, 'unixepoch'),
    datetime("created_at"/1000, 'unixepoch'),
    CASE WHEN "modified_at" IS NOT NULL THEN datetime("modified_at"/1000, 'unixepoch') ELSE NULL END,
    "hash",
    "path",
    UPPER("status"),
    "series_id",
    CASE WHEN "deleted_at" IS NOT NULL THEN datetime("deleted_at"/1000, 'unixepoch') ELSE NULL END,
    "koreader_hash"
FROM backup."media";

-- Dump pretty much everything from the backup table, excluding ID since it is auto-incrementing in the new schema
-- Missing: page_analysis
INSERT INTO "media_metadata"(
        "title",
        "series",
        "number",
        "volume",
        "summary",
        "notes",
        "genres",
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
FROM backup."media_metadata";

-- Now just go in alpha-ish order and dump everything:

-- Note: It is not feasible to port over the api_keys because a few columns were changed
-- INSERT INTO "api_keys"(
--         "id",
--         "name",
--         "short_token",
--         "long_token_hash",
--         "permissions",
--         "created_at",
--         "last_used_at",
--         "expires_at",
--         "user_id"
--     )
-- SELECT "id",
--     "name",
--     "short_token",
--     "long_token_hash",
--     "permissions",
--     "created_at",
--     "last_used_at",
--     "expires_at",
--     "user_id"
-- FROM backup."api_keys";

INSERT INTO "bookmarks"(
        "id",
        "preview_content",
        "epubcfi",
        "page",
        "media_id",
        "user_id"
    )
SELECT "id",
    "preview_content",
    "epubcfi",
    "page",
    "media_id",
    "user_id"
FROM backup."bookmarks";

INSERT INTO "emailer_send_records"(
        "id",
        "emailer_id",
        "recipient_email",
        "attachment_meta",
        "sent_at",
        "sent_by_user_id"
    )
SELECT "id",
    "emailer_id",
    "recipient_email",
    "attachment_meta",
    datetime("sent_at"/1000, 'unixepoch'),
    "sent_by_user_id"
FROM backup."emailer_send_records";

INSERT INTO "emailers"(
        "id",
        "name",
        "is_primary",
        "sender_email",
        "sender_display_name",
        "username",
        "encrypted_password",
        "smtp_host",
        "smtp_port",
        "tls_enabled",
        "max_attachment_size_bytes",
        "last_used_at"
    )
SELECT "id",
    "name",
    "is_primary",
    "sender_email",
    "sender_display_name",
    "username",
    "encrypted_password",
    "smtp_host",
    "smtp_port",
    "tls_enabled",
    "max_attachment_size_bytes",
    CASE WHEN "last_used_at" IS NOT NULL THEN datetime("last_used_at"/1000, 'unixepoch') ELSE NULL END
FROM backup."emailers";

INSERT INTO "jobs"(
        "id",
        "name",
        "description",
        "status",
        "save_state",
        "output_data",
        "ms_elapsed",
        "created_at",
        "completed_at"
    )
SELECT "id",
    "name",
    "description",
    UPPER("status"),
    "save_state",
    "output_data",
    "ms_elapsed",
    datetime("created_at"/1000, 'unixepoch'),
    CASE WHEN "completed_at" IS NOT NULL THEN datetime("completed_at"/1000, 'unixepoch') ELSE NULL END
FROM backup."jobs";

INSERT INTO "library_scan_records"(
        "id",
        "options",
        "timestamp",
        "library_id",
        "job_id"
    )
SELECT "id",
    "options",
    datetime("timestamp"/1000, 'unixepoch'),
    "library_id",
    "job_id"
FROM backup."library_scan_records";

INSERT INTO "logs"(
        "id",
        "level",
        "message",
        "context",
        "timestamp",
        "job_id"
    )
SELECT "id",
    "level",
    "message",
    "context",
    datetime("timestamp"/1000, 'unixepoch'),
    "job_id"
FROM backup."logs";

INSERT INTO "media_annotations"(
        "id",
        "highlighted_text",
        "epubcfi",
        "page",
        "page_coordinates_x",
        "page_coordinates_y",
        "notes",
        "user_id",
        "media_id"
    )
SELECT "id",
    "highlighted_text",
    "epubcfi",
    "page",
    "page_coordinates_x",
    "page_coordinates_y",
    "notes",
    "user_id",
    "media_id"
FROM backup."media_annotations";

INSERT INTO "registered_email_devices"(
        "id",
        "name",
        "email",
        "forbidden"
    )
SELECT "id",
    "name",
    "email",
    "forbidden"
FROM backup."registered_email_devices";

INSERT INTO "registered_reading_devices"(
        "id",
        "name",
        "kind"
    )
SELECT "id",
    "name",
    "kind"
FROM backup."registered_reading_devices";

-- Missing: permissions
-- Note: user_preferences_id will be updated after we create the mapping
INSERT INTO "users"(
        "id",
        "username",
        "hashed_password",
        "is_server_owner",
        "avatar_url",
        "created_at",
        "deleted_at",
        "is_locked",
        "max_sessions_allowed"
    )
SELECT "id",
    "username",
    "hashed_password",
    "is_server_owner",
    "avatar_url",
    datetime("created_at"/1000, 'unixepoch'),
    CASE WHEN "deleted_at" IS NOT NULL THEN datetime("deleted_at"/1000, 'unixepoch') ELSE NULL END,
    "is_locked",
    "max_sessions_allowed"
FROM backup."users";

-- Backfilling user preferences requires mapping old IDs to new auto-increment IDs
-- Step 1: Create a temporary mapping table for user preferences
CREATE TABLE "user_preferences_id_map" (
    "old_id" TEXT NOT NULL,
    "new_id" INTEGER NOT NULL,
    PRIMARY KEY ("old_id")
);

-- Step 2: Insert user preferences with new auto-increment IDs
-- Missing: app_font, navigation_arrangement, home_arrangement
INSERT INTO "user_preferences"(
        "preferred_layout_mode",
        "locale",
        "app_theme",
        "primary_navigation_mode",
        "layout_max_width_px",
        "show_query_indicator",
        "enable_live_refetch",
        "enable_discord_presence",
        "enable_compact_display",
        "enable_gradients",
        "enable_double_sidebar",
        "enable_replace_primary_sidebar",
        "enable_hide_scrollbar",
        "prefer_accent_color",
        "show_thumbnails_in_headers",
        "enable_job_overlay",
        "enable_alphabet_select",
        "app_font"
    )
SELECT "preferred_layout_mode",
    "locale",
    "app_theme",
    "primary_navigation_mode",
    "layout_max_width_px",
    "show_query_indicator",
    "enable_live_refetch",
    "enable_discord_presence",
    "enable_compact_display",
    "enable_gradients",
    "enable_double_sidebar",
    "enable_replace_primary_sidebar",
    "enable_hide_scrollbar",
    "prefer_accent_color",
    "show_thumbnails_in_headers",
    "enable_job_overlay",
    0, -- "enable_alphabet_select" is not in the old database (FALSE = 0 in SQLite)
    'INTER'
FROM backup."user_preferences";

-- Step 3: Create mapping of old user preferences IDs to new ones
-- We need to match each old record to its corresponding new record by insertion order
INSERT INTO "user_preferences_id_map" ("old_id", "new_id")
SELECT up_old."id",
    up_new."id"
FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") as rn
    FROM backup."user_preferences"
) up_old
JOIN (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") as rn
    FROM "user_preferences"
) up_new ON up_old.rn = up_new.rn;

-- Step 4: Update users table with mapped user_preferences_id
UPDATE "users" 
SET "user_preferences_id" = (
    SELECT map."new_id" 
    FROM "user_preferences_id_map" map 
    JOIN backup."users" bu ON bu."user_preferences_id" = map."old_id"
    WHERE bu."id" = "users"."id"
)
WHERE EXISTS (
    SELECT 1 
    FROM backup."users" bu 
    JOIN "user_preferences_id_map" map ON bu."user_preferences_id" = map."old_id"
    WHERE bu."id" = "users"."id"
);

-- Step 5: Update user_preferences table with user_id to complete the relationship
UPDATE "user_preferences" 
SET "user_id" = (
    SELECT u."id"
    FROM "users" u
    WHERE u."user_preferences_id" = "user_preferences"."id"
)
WHERE EXISTS (
    SELECT 1 
    FROM "users" u
    WHERE u."user_preferences_id" = "user_preferences"."id"
);

-- Step 6: Clean up the temporary mapping table
DROP TABLE "user_preferences_id_map";

INSERT INTO "user_login_activity"(
        "ip_address",
        "user_agent",
        "authentication_successful",
        "timestamp",
        "user_id"
    )
SELECT "ip_address",
    "user_agent",
    "authentication_successful",
    datetime("timestamp"/1000, 'unixepoch'),
    "user_id"
FROM backup."user_login_activity";

INSERT INTO "age_restrictions"(
        "age",
        "restrict_on_unset",
        "user_id"
    )
SELECT "age",
    "restrict_on_unset",
    "user_id"
FROM backup."age_restrictions";

INSERT INTO "reading_sessions"(
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
    datetime("started_at"/1000, 'unixepoch'),
    datetime("updated_at"/1000, 'unixepoch'),
    "media_id",
    "user_id",
    "device_id",
    "elapsed_seconds"
FROM backup."reading_sessions";

INSERT INTO "finished_reading_sessions"(
        "started_at",
        "completed_at",
        "media_id",
        "user_id",
        "device_id",
        "elapsed_seconds"
    )
SELECT datetime("started_at"/1000, 'unixepoch'),
    datetime("completed_at"/1000, 'unixepoch'),
    "media_id",
    "user_id",
    "device_id",
    "elapsed_seconds"
FROM backup."finished_reading_sessions";

INSERT INTO "last_library_visits"(
        "user_id",
        "library_id",
        "timestamp"
    )
SELECT "user_id",
    "library_id",
    datetime("timestamp"/1000, 'unixepoch')
FROM backup."last_library_visits";

-- Remove the current server_config
DELETE FROM "server_config";
-- Insert the server_config from the backup database
INSERT INTO "server_config"(
        "public_url",
        "initial_wal_setup_complete",
        "encryption_key"
    )
SELECT "public_url",
    "initial_wal_setup_complete",
    "encryption_key"
FROM backup."server_config";

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
PRAGMA foreign_key_check;
COMMIT;

-- There are a few features which simply could not be migrated due to complexity of the change:
-- 1. Smart Lists
-- 2. Scheduled Jobs