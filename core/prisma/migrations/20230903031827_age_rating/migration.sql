/*
  Warnings:

  - You are about to alter the column `age_rating` on the `series_metadata` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- AlterTable
ALTER TABLE "media_metadata" ADD COLUMN "age_rating" INTEGER;

-- CreateTable
CREATE TABLE "age_restrictions" (
    "age" INTEGER NOT NULL,
    "restrict_on_unset" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "age_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_series_metadata" (
    "meta_type" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "publisher" TEXT,
    "imprint" TEXT,
    "comicid" INTEGER,
    "volume" INTEGER,
    "booktype" TEXT,
    "age_rating" INTEGER,
    "status" TEXT,
    "series_id" TEXT NOT NULL PRIMARY KEY,
    CONSTRAINT "series_metadata_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_series_metadata" ("age_rating", "booktype", "comicid", "imprint", "meta_type", "publisher", "series_id", "status", "summary", "title", "volume") SELECT "age_rating", "booktype", "comicid", "imprint", "meta_type", "publisher", "series_id", "status", "summary", "title", "volume" FROM "series_metadata";
DROP TABLE "series_metadata";
ALTER TABLE "new_series_metadata" RENAME TO "series_metadata";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "age_restrictions_user_id_key" ON "age_restrictions"("user_id");
