/*
  Warnings:

  - You are about to drop the `MediaAnnotation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `checksum` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `downloaded` on the `media` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MediaAnnotation";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "series_metadata" (
    "meta_type" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "publisher" TEXT,
    "imprint" TEXT,
    "comicid" INTEGER,
    "volume" INTEGER,
    "booktype" TEXT,
    "age_rating" TEXT,
    "status" TEXT,
    "series_id" TEXT NOT NULL PRIMARY KEY,
    CONSTRAINT "series_metadata_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media_metadata" (
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
    "media_id" TEXT NOT NULL PRIMARY KEY,
    CONSTRAINT "media_metadata_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media_annotations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "epubcfi" TEXT,
    "text" TEXT,
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    CONSTRAINT "media_annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "media_annotations_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    "metadata_id" TEXT,
    "series_id" TEXT,
    CONSTRAINT "media_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media" ("created_at", "extension", "id", "modified_at", "name", "pages", "path", "series_id", "size", "status", "updated_at") SELECT "created_at", "extension", "id", "modified_at", "name", "pages", "path", "series_id", "size", "status", "updated_at" FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media" RENAME TO "media";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
