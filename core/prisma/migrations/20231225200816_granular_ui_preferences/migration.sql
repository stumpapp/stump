/*
  Warnings:

  - You are about to drop the column `collection_layout_mode` on the `user_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `library_layout_mode` on the `user_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `series_layout_mode` on the `user_preferences` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preferred_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "app_theme" TEXT NOT NULL DEFAULT 'LIGHT',
    "show_query_indicator" BOOLEAN NOT NULL DEFAULT false,
    "enable_discord_presence" BOOLEAN NOT NULL DEFAULT false,
    "enable_compact_display" BOOLEAN NOT NULL DEFAULT false,
    "enable_double_sidebar" BOOLEAN NOT NULL DEFAULT true,
    "enable_replace_primary_sidebar" BOOLEAN NOT NULL DEFAULT false,
    "prefer_accent_color" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT
);
INSERT INTO "new_user_preferences" ("app_theme", "enable_discord_presence", "id", "locale", "show_query_indicator", "user_id") SELECT "app_theme", "enable_discord_presence", "id", "locale", "show_query_indicator", "user_id" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
