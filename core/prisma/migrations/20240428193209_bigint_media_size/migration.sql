/*
  Warnings:

  - You are about to alter the column `size` on the `media` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
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
