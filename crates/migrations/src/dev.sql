CREATE TABLE "age_restrictions" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "age" integer NOT NULL, "restrict_on_unset" boolean NOT NULL, "user_id" text NOT NULL UNIQUE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "api_keys" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" text NOT NULL, "short_token" text NOT NULL, "long_token_hash" text NOT NULL, "permissions" json_text, "created_at" DATETIME NOT NULL DEFAULT 'CURRENT_TIMESTAMP', "last_used_at" DATETIME, "expires_at" DATETIME, "user_id" text NOT NULL, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_book_suggestion_likes" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "timestamp" DATETIME NOT NULL, "liked_by_id" text NOT NULL, "suggestion_id" text NOT NULL, FOREIGN KEY ("suggestion_id") REFERENCES "book_club_book_suggestions" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("liked_by_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_book_suggestions" ( "id" text NOT NULL PRIMARY KEY, "title" text, "author" text, "url" text, "notes" text, "suggested_by_id" text NOT NULL, "book_id" text, FOREIGN KEY ("suggested_by_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("book_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_books" ( "id" text NOT NULL PRIMARY KEY, "start_at" DATETIME NOT NULL, "end_at" DATETIME NOT NULL, "discussion_duration_days" integer, "title" text, "author" text, "url" text, "image_url" text, "book_entity_id" text, "book_club_schedule_id" integer, FOREIGN KEY ("book_club_schedule_id") REFERENCES "book_club_schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("book_entity_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_discussion_message" ( "id" text NOT NULL PRIMARY KEY, "content" text NOT NULL, "timestamp" DATETIME NOT NULL, "is_top_message" boolean NOT NULL, "deleted_at" DATETIME, "parent_message_id" text, "discussion_id" text NOT NULL, "member_id" text, FOREIGN KEY ("parent_message_id") REFERENCES "book_club_discussion_message" ("id") ON DELETE SET NULL ON UPDATE CASCADE, FOREIGN KEY ("discussion_id") REFERENCES "book_club_discussions" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("member_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_discussion_message_likes" ( "id" text NOT NULL PRIMARY KEY, "timestamp" DATETIME NOT NULL, "liked_by_id" text NOT NULL, "message_id" text NOT NULL, FOREIGN KEY ("message_id") REFERENCES "book_club_discussion_message" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("liked_by_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_discussions" ( "id" text NOT NULL PRIMARY KEY, "is_locked" boolean NOT NULL, "book_club_book_id" text NOT NULL UNIQUE, FOREIGN KEY ("book_club_book_id") REFERENCES "book_club_books" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_invitations" ( "id" text NOT NULL PRIMARY KEY, "role" integer NOT NULL, "user_id" text NOT NULL, "book_club_id" text NOT NULL, FOREIGN KEY ("book_club_id") REFERENCES "book_clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_member_favorite_books" ( "id" text NOT NULL PRIMARY KEY, "title" text, "author" text, "url" text, "notes" text, "member_id" text NOT NULL UNIQUE, "book_id" text, "image_url" text, FOREIGN KEY ("member_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("book_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_members" ( "id" text NOT NULL PRIMARY KEY, "display_name" text, "is_creator" boolean NOT NULL, "hide_progress" boolean NOT NULL, "private_membership" boolean NOT NULL, "role" integer NOT NULL, "user_id" text NOT NULL, "book_club_id" text NOT NULL, FOREIGN KEY ("book_club_id") REFERENCES "book_clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_club_schedules" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "default_interval_days" integer, "book_club_id" varchar NOT NULL, FOREIGN KEY ("book_club_id") REFERENCES "book_clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "book_clubs" ( "id" text NOT NULL PRIMARY KEY, "name" text NOT NULL, "slug" text NOT NULL UNIQUE, "description" text, "is_private" boolean NOT NULL, "member_role_spec" json_text, "created_at" DATETIME NOT NULL, "emoji" text );

CREATE TABLE "bookmarks" ( "id" text NOT NULL PRIMARY KEY, "preview_content" text, "locator" json_text, "epubcfi" text, "page" integer, "media_id" text NOT NULL, "user_id" text NOT NULL, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "emailer_send_records" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "emailer_id" integer NOT NULL, "recipient_email" text NOT NULL, "attachment_meta" blob, "sent_at" DATETIME NOT NULL, "sent_by_user_id" text, FOREIGN KEY ("emailer_id") REFERENCES "emailers" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("sent_by_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "emailers" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" text NOT NULL UNIQUE, "is_primary" boolean NOT NULL, "sender_email" text NOT NULL, "sender_display_name" text NOT NULL, "username" text NOT NULL, "encrypted_password" text NOT NULL, "smtp_host" text NOT NULL, "smtp_port" integer NOT NULL, "tls_enabled" boolean NOT NULL, "max_attachment_size_bytes" integer, "max_num_attachments" integer, "last_used_at" DATETIME );

CREATE TABLE "favorite_libraries" ( "user_id" text NOT NULL, "library_id" text NOT NULL, "favorited_at" DATETIME NOT NULL, CONSTRAINT "pk-favorite_libraries" PRIMARY KEY ("user_id", "library_id"), FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "favorite_media" ( "user_id" text NOT NULL, "media_id" text NOT NULL, "favorited_at" DATETIME NOT NULL, CONSTRAINT "pk-favorite_media" PRIMARY KEY ("user_id", "media_id"), FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "favorite_series" ( "user_id" text NOT NULL, "series_id" text NOT NULL, "favorited_at" DATETIME NOT NULL, CONSTRAINT "pk-favorite_series" PRIMARY KEY ("user_id", "series_id"), FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "finished_reading_sessions" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "started_at" DATETIME NOT NULL, "completed_at" DATETIME NOT NULL, "media_id" text NOT NULL, "user_id" text NOT NULL, "device_id" text, "elapsed_seconds" bigint, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("device_id") REFERENCES "registered_reading_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "jobs" ( "id" text NOT NULL PRIMARY KEY, "name" text NOT NULL, "description" text, "status" text NOT NULL, "save_state" blob, "output_data" blob, "ms_elapsed" bigint NOT NULL, "created_at" DATETIME NOT NULL, "completed_at" DATETIME );

CREATE TABLE "last_library_visits" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "user_id" text NOT NULL, "library_id" text NOT NULL, "timestamp" DATETIME NOT NULL, FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "libraries" ( "id" text NOT NULL PRIMARY KEY, "name" text NOT NULL UNIQUE, "description" text, "path" text NOT NULL UNIQUE, "status" text NOT NULL, "created_at" DATETIME NOT NULL, "updated_at" DATETIME, "emoji" text, "config_id" integer NOT NULL, "last_scanned_at" DATETIME, FOREIGN KEY ("config_id") REFERENCES "library_configs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE );

CREATE TABLE "library_configs" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "convert_rar_to_zip" boolean NOT NULL, "hard_delete_conversions" boolean NOT NULL, "default_reading_dir" text NOT NULL, "default_reading_mode" text NOT NULL, "default_reading_image_scale_fit" text NOT NULL, "generate_file_hashes" boolean NOT NULL, "generate_koreader_hashes" boolean NOT NULL, "process_metadata" boolean NOT NULL, "watch" boolean NOT NULL, "library_pattern" text NOT NULL, "thumbnail_config" json_text, "ignore_rules" json_text, "library_id" text );

CREATE TABLE "library_exclusions" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "user_id" text NOT NULL, "library_id" text NOT NULL, FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "library_scan_records" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "options" blob, "timestamp" DATETIME NOT NULL, "library_id" text NOT NULL, "job_id" text UNIQUE, FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "library_tags" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "library_id" text NOT NULL, "tag_id" integer NOT NULL, FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "logs" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "level" text NOT NULL, "message" text NOT NULL, "timestamp" DATETIME NOT NULL, "job_id" text, "context" text, FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "media" ( "id" text NOT NULL PRIMARY KEY, "name" text NOT NULL, "size" bigint NOT NULL, "extension" text NOT NULL, "pages" integer NOT NULL, "updated_at" DATETIME, "created_at" DATETIME NOT NULL, "modified_at" DATETIME, "hash" text, "koreader_hash" text, "path" text NOT NULL, "status" text NOT NULL, "series_id" text, "deleted_at" DATETIME, FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "media_annotations" ( "id" text NOT NULL PRIMARY KEY, "highlighted_text" text, "epubcfi" text, "page" integer, "page_coordinates_x" real, "page_coordinates_y" real, "notes" text, "user_id" text NOT NULL, "media_id" text NOT NULL, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "media_metadata" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "media_id" text UNIQUE, "age_rating" integer, "characters" text, "colorists" text, "cover_artists" text, "day" integer, "editors" text, "genres" text, "identifier_amazon" text, "identifier_calibre" text, "identifier_google" text, "identifier_isbn" text, "identifier_mobi_asin" text, "identifier_uuid" text, "inkers" text, "language" text, "letterers" text, "links" text, "month" integer, "notes" text, "number" real, "page_count" integer, "pencillers" text, "publisher" text, "series" text, "summary" text, "teams" text, "title" text, "title_sort" text, "volume" integer, "writers" text, "year" integer, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "media_tags" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "media_id" text NOT NULL, "tag_id" integer NOT NULL, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "notifiers" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "type" text NOT NULL, "config" blob NOT NULL );

CREATE TABLE "page_analysis" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "data" json_text NOT NULL, "media_id" text NOT NULL UNIQUE, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "reading_sessions" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "page" integer, "percentage_completed" real, "locator" json_text, "epubcfi" text, "koreader_progress" text, "started_at" DATETIME NOT NULL, "updated_at" DATETIME, "media_id" text NOT NULL, "user_id" text NOT NULL, "device_id" text, "elapsed_seconds" bigint, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("device_id") REFERENCES "registered_reading_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "refresh_tokens" ( "id" text NOT NULL PRIMARY KEY, "user_id" text NOT NULL, "created_at" DATETIME NOT NULL, "expires_at" DATETIME NOT NULL, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "registered_email_devices" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" text NOT NULL UNIQUE, "email" text NOT NULL, "forbidden" boolean NOT NULL );

CREATE TABLE "registered_reading_devices" ( "id" text NOT NULL PRIMARY KEY, "name" text NOT NULL UNIQUE, "kind" text );

CREATE TABLE "reviews" ( "id" text NOT NULL PRIMARY KEY, "rating" integer NOT NULL, "content" text, "is_private" boolean NOT NULL, "media_id" text NOT NULL, "user_id" text NOT NULL, FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "scheduled_job_configs" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "interval_secs" integer NOT NULL );

CREATE TABLE "scheduled_job_libraries" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "schedule_id" integer NOT NULL, "library_id" text NOT NULL, FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("schedule_id") REFERENCES "scheduled_job_configs" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "series" ( "id" text NOT NULL PRIMARY KEY, "name" text NOT NULL, "description" text, "created_at" DATETIME NOT NULL, "updated_at" DATETIME, "deleted_at" DATETIME, "path" text NOT NULL, "status" text NOT NULL, "library_id" text, FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "series_metadata" ( "series_id" text NOT NULL PRIMARY KEY, "age_rating" integer, "characters" text, "booktype" text, "comicid" integer, "genres" text, "imprint" text, "links" text, "meta_type" text, "publisher" text, "status" text, "summary" text, "title" text, "volume" integer, "writers" text, FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "series_tags" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "series_id" text NOT NULL, "tag_id" integer NOT NULL, FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "server_config" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "public_url" text, "initial_wal_setup_complete" boolean NOT NULL, "encryption_key" text );

CREATE TABLE "server_invitations" ( "id" text NOT NULL PRIMARY KEY, "secret" text NOT NULL, "email" text, "granted_permissions" text, "created_at" DATETIME NOT NULL, "expires_at" DATETIME NOT NULL );

CREATE TABLE "sessions" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "session_id" varchar NOT NULL, "user_id" varchar NOT NULL, "created_at" DATETIME NOT NULL, "expiry_time" DATETIME NOT NULL, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "smart_list_access_rules" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "role" varchar NOT NULL, "user_id" text NOT NULL, "smart_list_id" text NOT NULL, FOREIGN KEY ("smart_list_id") REFERENCES "smart_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "smart_list_views" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" text NOT NULL, "list_id" text NOT NULL, "data" blob NOT NULL, FOREIGN KEY ("list_id") REFERENCES "smart_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "smart_lists" ( "id" text NOT NULL PRIMARY KEY, "name" text NOT NULL, "description" text, "filters" blob NOT NULL, "joiner" text NOT NULL, "default_grouping" text NOT NULL, "visibility" text NOT NULL, "creator_id" text NOT NULL, FOREIGN KEY ("creator_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "tags" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" text NOT NULL UNIQUE );

CREATE TABLE "user_login_activity" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "ip_address" text NOT NULL, "user_agent" text NOT NULL, "authentication_successful" boolean NOT NULL, "timestamp" DATETIME NOT NULL, "user_id" text NOT NULL, FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE "user_preferences" ( "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "preferred_layout_mode" text NOT NULL, "locale" text NOT NULL, "app_theme" text NOT NULL, "app_font" text NOT NULL, "primary_navigation_mode" text NOT NULL, "layout_max_width_px" integer, "show_query_indicator" boolean NOT NULL, "enable_live_refetch" boolean NOT NULL, "enable_discord_presence" boolean NOT NULL, "enable_compact_display" boolean NOT NULL, "enable_gradients" boolean NOT NULL, "enable_double_sidebar" boolean NOT NULL, "enable_replace_primary_sidebar" boolean NOT NULL, "enable_hide_scrollbar" boolean NOT NULL, "prefer_accent_color" boolean NOT NULL, "show_thumbnails_in_headers" boolean NOT NULL, "enable_job_overlay" boolean NOT NULL, "enable_alphabet_select" boolean NOT NULL, "navigation_arrangement" json_text, "home_arrangement" json_text, "user_id" text UNIQUE );

CREATE TABLE "users" ( "id" text NOT NULL PRIMARY KEY, "username" text NOT NULL UNIQUE, "hashed_password" text NOT NULL, "is_server_owner" boolean NOT NULL, "avatar_url" text, "created_at" DATETIME NOT NULL, "deleted_at" DATETIME, "is_locked" boolean NOT NULL, "max_sessions_allowed" integer, "permissions" text, "user_preferences_id" integer UNIQUE, FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences" ("id") ON DELETE CASCADE ON UPDATE CASCADE );

