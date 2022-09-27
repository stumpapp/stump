-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_library_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "convert_rar_to_zip" BOOLEAN NOT NULL DEFAULT false,
    "hard_delete_conversions" BOOLEAN NOT NULL DEFAULT false,
    "create_webp_thumbnails" BOOLEAN NOT NULL DEFAULT false,
    "library_pattern" TEXT NOT NULL DEFAULT 'SERIES_BASED',
    "library_id" TEXT
);
INSERT INTO "new_library_options" ("convert_rar_to_zip", "create_webp_thumbnails", "hard_delete_conversions", "id", "library_id") SELECT "convert_rar_to_zip", "create_webp_thumbnails", "hard_delete_conversions", "id", "library_id" FROM "library_options";
DROP TABLE "library_options";
ALTER TABLE "new_library_options" RENAME TO "library_options";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
