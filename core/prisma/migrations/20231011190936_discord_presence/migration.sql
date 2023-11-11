-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "library_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "series_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "collection_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "app_theme" TEXT NOT NULL DEFAULT 'LIGHT',
    "show_query_indicator" BOOLEAN NOT NULL DEFAULT false,
    "enable_discord_presence" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT
);
INSERT INTO "new_user_preferences" ("app_theme", "collection_layout_mode", "id", "library_layout_mode", "locale", "series_layout_mode", "show_query_indicator", "user_id") SELECT "app_theme", "collection_layout_mode", "id", "library_layout_mode", "locale", "series_layout_mode", "show_query_indicator", "user_id" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
