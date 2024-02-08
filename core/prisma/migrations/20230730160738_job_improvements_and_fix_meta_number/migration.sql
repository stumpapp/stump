/*
  Warnings:

  - You are about to alter the column `number` on the `media_metadata` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to drop the column `details` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `jobs` table. All the data in the column will be lost.
  - Added the required column `name` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "series" TEXT,
    "number" REAL,
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
INSERT INTO "new_media_metadata" ("characters", "colorists", "cover_artists", "day", "editors", "genre", "id", "inkers", "letterers", "links", "media_id", "month", "notes", "number", "page_count", "pencillers", "publisher", "series", "summary", "teams", "title", "volume", "writers", "year") SELECT "characters", "colorists", "cover_artists", "day", "editors", "genre", "id", "inkers", "letterers", "links", "media_id", "month", "notes", "number", "page_count", "pencillers", "publisher", "series", "summary", "teams", "title", "volume", "writers", "year" FROM "media_metadata";
DROP TABLE "media_metadata";
ALTER TABLE "new_media_metadata" RENAME TO "media_metadata";
CREATE UNIQUE INDEX "media_metadata_media_id_key" ON "media_metadata"("media_id");
CREATE TABLE "new_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "state" BLOB,
    "extra_metadata" BLOB,
    "task_count" INTEGER NOT NULL DEFAULT 1,
    "completed_task_count" INTEGER NOT NULL DEFAULT 0,
    "ms_elapsed" BIGINT NOT NULL DEFAULT 0,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_jobs" ("completed_at", "completed_task_count", "id", "ms_elapsed", "status", "task_count") SELECT "completed_at", "completed_task_count", "id", "ms_elapsed", "status", "task_count" FROM "jobs";
DROP TABLE "jobs";
ALTER TABLE "new_jobs" RENAME TO "jobs";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
