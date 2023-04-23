-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "library_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "series_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "collection_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "app_theme" TEXT NOT NULL DEFAULT 'LIGHT'
);
INSERT INTO "new_user_preferences" ("collection_layout_mode", "id", "library_layout_mode", "locale", "series_layout_mode") SELECT "collection_layout_mode", "id", "library_layout_mode", "locale", "series_layout_mode" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
