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
    CONSTRAINT "series_metadata_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_series_metadata" ("age_rating", "booktype", "comicid", "imprint", "meta_type", "publisher", "series_id", "status", "summary", "title", "volume") SELECT "age_rating", "booktype", "comicid", "imprint", "meta_type", "publisher", "series_id", "status", "summary", "title", "volume" FROM "series_metadata";
DROP TABLE "series_metadata";
ALTER TABLE "new_series_metadata" RENAME TO "series_metadata";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
