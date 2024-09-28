-- AlterTable
ALTER TABLE "media" ADD COLUMN "deleted_at" DATETIME;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_library_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "convert_rar_to_zip" BOOLEAN NOT NULL DEFAULT false,
    "hard_delete_conversions" BOOLEAN NOT NULL DEFAULT false,
    "default_reading_dir" TEXT NOT NULL DEFAULT 'ltr',
    "default_reading_mode" TEXT NOT NULL DEFAULT 'paged',
    "default_reading_image_scale_fit" TEXT NOT NULL DEFAULT 'height',
    "generate_file_hashes" BOOLEAN NOT NULL DEFAULT false,
    "process_metadata" BOOLEAN NOT NULL DEFAULT true,
    "library_pattern" TEXT NOT NULL DEFAULT 'SERIES_BASED',
    "thumbnail_config" BLOB,
    "ignore_rules" BLOB,
    "library_id" TEXT
);
INSERT INTO "new_library_configs" ("convert_rar_to_zip", "generate_file_hashes", "hard_delete_conversions", "id", "ignore_rules", "library_id", "library_pattern", "process_metadata", "thumbnail_config") SELECT "convert_rar_to_zip", "generate_file_hashes", "hard_delete_conversions", "id", "ignore_rules", "library_id", "library_pattern", "process_metadata", "thumbnail_config" FROM "library_configs";
DROP TABLE "library_configs";
ALTER TABLE "new_library_configs" RENAME TO "library_configs";
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preferred_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "app_theme" TEXT NOT NULL DEFAULT 'LIGHT',
    "app_font" TEXT NOT NULL DEFAULT 'inter',
    "primary_navigation_mode" TEXT NOT NULL DEFAULT 'SIDEBAR',
    "layout_max_width_px" INTEGER DEFAULT 1280,
    "show_query_indicator" BOOLEAN NOT NULL DEFAULT false,
    "enable_live_refetch" BOOLEAN NOT NULL DEFAULT false,
    "enable_discord_presence" BOOLEAN NOT NULL DEFAULT false,
    "enable_compact_display" BOOLEAN NOT NULL DEFAULT false,
    "enable_gradients" BOOLEAN NOT NULL DEFAULT false,
    "enable_double_sidebar" BOOLEAN NOT NULL DEFAULT true,
    "enable_replace_primary_sidebar" BOOLEAN NOT NULL DEFAULT false,
    "enable_hide_scrollbar" BOOLEAN NOT NULL DEFAULT false,
    "prefer_accent_color" BOOLEAN NOT NULL DEFAULT true,
    "show_thumbnails_in_headers" BOOLEAN NOT NULL DEFAULT false,
    "navigation_arrangement" BLOB,
    "home_arrangement" BLOB,
    "user_id" TEXT
);
INSERT INTO "new_user_preferences" ("app_font", "app_theme", "enable_compact_display", "enable_discord_presence", "enable_double_sidebar", "enable_hide_scrollbar", "enable_live_refetch", "enable_replace_primary_sidebar", "home_arrangement", "id", "layout_max_width_px", "locale", "navigation_arrangement", "prefer_accent_color", "preferred_layout_mode", "primary_navigation_mode", "show_query_indicator", "show_thumbnails_in_headers", "user_id") SELECT "app_font", "app_theme", "enable_compact_display", "enable_discord_presence", "enable_double_sidebar", "enable_hide_scrollbar", "enable_live_refetch", "enable_replace_primary_sidebar", "home_arrangement", "id", "layout_max_width_px", "locale", "navigation_arrangement", "prefer_accent_color", "preferred_layout_mode", "primary_navigation_mode", "show_query_indicator", "show_thumbnails_in_headers", "user_id" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
