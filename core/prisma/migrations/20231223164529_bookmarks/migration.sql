/*
  Warnings:

  - You are about to drop the column `kind` on the `media_annotations` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `media_annotations` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preview_content" TEXT,
    "epubcfi" TEXT,
    "page" INTEGER,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "bookmarks_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media_annotations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "highlighted_text" TEXT,
    "epubcfi" TEXT,
    "page" INTEGER,
    "page_coordinates_x" REAL,
    "page_coordinates_y" REAL,
    "notes" TEXT,
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    CONSTRAINT "media_annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "media_annotations_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_annotations" ("epubcfi", "id", "media_id", "user_id") SELECT "epubcfi", "id", "media_id", "user_id" FROM "media_annotations";
DROP TABLE "media_annotations";
ALTER TABLE "new_media_annotations" RENAME TO "media_annotations";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_media_id_epubcfi_page_key" ON "bookmarks"("user_id", "media_id", "epubcfi", "page");
