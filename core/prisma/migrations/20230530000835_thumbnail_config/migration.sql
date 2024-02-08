/*
  Warnings:

  - You are about to drop the column `create_webp_thumbnails` on the `library_options` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_reading_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "ordering" TEXT NOT NULL DEFAULT 'MANUAL',
    "creating_user_id" TEXT NOT NULL,
    CONSTRAINT "reading_lists_creating_user_id_fkey" FOREIGN KEY ("creating_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reading_lists" ("creating_user_id", "description", "id", "name", "updated_at", "visibility") SELECT "creating_user_id", "description", "id", "name", "updated_at", "visibility" FROM "reading_lists";
DROP TABLE "reading_lists";
ALTER TABLE "new_reading_lists" RENAME TO "reading_lists";
CREATE UNIQUE INDEX "reading_lists_creating_user_id_name_key" ON "reading_lists"("creating_user_id", "name");
CREATE TABLE "new_library_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "convert_rar_to_zip" BOOLEAN NOT NULL DEFAULT false,
    "hard_delete_conversions" BOOLEAN NOT NULL DEFAULT false,
    "library_pattern" TEXT NOT NULL DEFAULT 'SERIES_BASED',
    "thumbnail_config" BLOB,
    "library_id" TEXT
);
INSERT INTO "new_library_options" ("convert_rar_to_zip", "hard_delete_conversions", "id", "library_id", "library_pattern") SELECT "convert_rar_to_zip", "hard_delete_conversions", "id", "library_id", "library_pattern" FROM "library_options";
DROP TABLE "library_options";
ALTER TABLE "new_library_options" RENAME TO "library_options";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
