-- This SQL file is used to 'fix' the data in the database after the migration. BE SURE TO BACKUP BEFORE UPDATING:

-- 1. open the newly migrated database in your preferred SQLite client, I use TablePlus but it doesn't matter. You may also use the CLI e.g. sqlite3 stump.db < resolve-missing-data.sql
--    you must use absolute paths to the databases, replace with your path
ATTACH DATABASE '/replace/with/full/path/to/stump-before-migration.db' as 'backup';

-- 2. run the following SQL to copy the data from the old database to the new database:
BEGIN;
PRAGMA foreign_keys = OFF;

-- TODO: Copy data from the old database to the new database
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
INSERT INTO "tags" ("name", "created_at")
SELECT "name",
    "created_at"
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
SELECT mtg."media_id",
    map."new_id"
FROM backup."_MediaToTag" mtg
    JOIN "tag_id_map" map ON mtg."tag_id" = map."old_id";

-- Series tags
INSERT INTO "series_tags" ("series_id", "tag_id")
SELECT stg."series_id",
    map."new_id"
FROM backup."_SeriesToTag" stg
    JOIN "tag_id_map" map ON stg."tag_id" = map."old_id";

-- Library tags
INSERT INTO "library_tags" ("library_id", "tag_id")
SELECT ltg."library_id",
    map."new_id"
FROM backup."_LibraryToTag" ltg
    JOIN "tag_id_map" map ON ltg."tag_id" = map."old_id";

-- Step 5: Clean up the temporary mapping table. We should be done at this point with tags
DROP TABLE "tag_id_map";

-- Backfill the library and library-related tables:

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
FROM backup."library_configs";

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
    "status",
    "updated_at",
    "created_at",
    "emoji",
    "config_id",
    "last_scanned_at"
FROM backup."libraries";

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
    "updated_at",
    "created_at",
    "path",
    "status",
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
    "updated_at",
    "created_at",
    "modified_at",
    "hash",
    "path",
    "status",
    "series_id",
    "deleted_at",
    "koreader_hash"
FROM backup."media";

-- Dump pretty much everything from the backup table, excluding ID since it is auto-incrementing in the new schema
INSERT INTO "media_metadata"(
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
FROM backup."media_metadata";
-- TODO: We need to figure out how to handle the page_analysis column

-- Now just go in alpha-ish order and dump everything:

INSERT INTO "api_keys"(
        "id",
        "name",
        "short_token",
        "long_token_hash",
        "permissions",
        "created_at",
        "last_used_at",
        "expires_at",
        "user_id"
    )
SELECT "id",
    "name",
    "short_token",
    "long_token_hash",
    "permissions",
    "created_at",
    "last_used_at",
    "expires_at",
    "user_id"
FROM backup."api_keys";

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
    "sent_at",
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
    "last_used_at"
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
    "status",
    "save_state",
    "output_data",
    "ms_elapsed",
    "created_at",
    "completed_at"
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
    "timestamp",
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
    "timestamp",
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


INSERT INTO "users"(
        "id",
        "username",
        "hashed_password",
        "is_server_owner",
        "avatar_url",
        "created_at",
        "deleted_at",
        "is_locked",
        "max_sessions_allowed",
        "permissions",
        "user_preferences_id"
    )
SELECT "id",
    "username",
    "hashed_password",
    "is_server_owner",
    "avatar_url",
    "created_at",
    "deleted_at",
    "is_locked",
    "max_sessions_allowed",
    "permissions",
    "user_preferences_id"
FROM backup."users";

INSERT INTO "user_preferences"(
        "id",
        "preferred_layout_mode",
        "locale",
        "app_theme",
        "app_font",
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
        "enable_alphabet_select"
    )
SELECT "id",
    "preferred_layout_mode",
    "locale",
    "app_theme",
    "app_font",
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
    FALSE -- "enable_alphabet_select" is not in the new old database
FROM backup."user_preferences";

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
    "timestamp",
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
    "started_at",
    "updated_at",
    "media_id",
    "user_id",
    "device_id",
    "elapsed_seconds"
FROM backup."reading_sessions";

INSERT INTO "finshed_reading_sessions"(
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
FROM backup."finished_reading_sessions";

INSERT INTO "last_library_visits"(
        "user_id",
        "library_id",
        "timestamp"
    )
SELECT "user_id",
    "library_id",
    "timestamp"
FROM backup."last_library_visits";


PRAGMA foreign_keys = ON;
PRAGMA foreign_key_check;
COMMIT;

-- There are a few features which simply could not be migrated due to complexity of the change:
-- 1. Smart Lists
-- 2. Scheduled Jobs