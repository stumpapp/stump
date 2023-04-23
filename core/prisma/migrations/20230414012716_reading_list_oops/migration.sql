/*
  Warnings:

  - You are about to drop the column `reading_list_id` on the `media` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "reading_list_items" (
    "display_order" INTEGER NOT NULL,
    "media_id" TEXT NOT NULL,
    "reading_list_id" TEXT NOT NULL,
    CONSTRAINT "reading_list_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reading_list_items_reading_list_id_fkey" FOREIGN KEY ("reading_list_id") REFERENCES "reading_lists" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" INTEGER NOT NULL,
    "extension" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "series_id" TEXT,
    CONSTRAINT "media_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media" ("checksum", "created_at", "description", "downloaded", "extension", "id", "modified_at", "name", "pages", "path", "series_id", "size", "status", "updated_at") SELECT "checksum", "created_at", "description", "downloaded", "extension", "id", "modified_at", "name", "pages", "path", "series_id", "size", "status", "updated_at" FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media" RENAME TO "media";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "reading_list_items_media_id_reading_list_id_key" ON "reading_list_items"("media_id", "reading_list_id");
