-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" INTEGER NOT NULL,
    "extension" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "seriesId" TEXT,
    CONSTRAINT "media_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media" ("checksum", "description", "downloaded", "extension", "id", "name", "pages", "path", "seriesId", "size", "updatedAt") SELECT "checksum", "description", "downloaded", "extension", "id", "name", "pages", "path", "seriesId", "size", "updatedAt" FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media" RENAME TO "media";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
