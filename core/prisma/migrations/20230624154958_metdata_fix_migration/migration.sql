/*
  Warnings:

  - The primary key for the `media_metadata` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `metadata_id` on the `media` table. All the data in the column will be lost.
  - The required column `id` was added to the `media_metadata` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "series" TEXT,
    "number" INTEGER,
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
    CONSTRAINT "media_metadata_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_metadata" ("characters", "colorists", "cover_artists", "day", "editors", "genre", "inkers", "letterers", "links", "media_id", "month", "notes", "number", "page_count", "pencillers", "publisher", "series", "summary", "teams", "title", "volume", "writers", "year") SELECT "characters", "colorists", "cover_artists", "day", "editors", "genre", "inkers", "letterers", "links", "media_id", "month", "notes", "number", "page_count", "pencillers", "publisher", "series", "summary", "teams", "title", "volume", "writers", "year" FROM "media_metadata";
DROP TABLE "media_metadata";
ALTER TABLE "new_media_metadata" RENAME TO "media_metadata";
CREATE UNIQUE INDEX "media_metadata_media_id_key" ON "media_metadata"("media_id");
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "extension" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" DATETIME,
    "hash" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "series_id" TEXT,
    CONSTRAINT "media_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media" ("created_at", "extension", "hash", "id", "modified_at", "name", "pages", "path", "series_id", "size", "status", "updated_at") SELECT "created_at", "extension", "hash", "id", "modified_at", "name", "pages", "path", "series_id", "size", "status", "updated_at" FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media" RENAME TO "media";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
