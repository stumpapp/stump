BEGIN TRANSACTION;
PRAGMA foreign_keys = OFF;
-- We must convert all of Prisma's lookup tables to be something more readable:
-- _LibraryToUser -> _library_hidden_to_user
-- _LibraryToTag -> _library_to_tag
-- _MediaToTag -> _media_to_tag
-- _SeriesToTag -> _series_to_tag
CREATE TABLE "_library_hidden_to_user" (
    "library_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "_library_hidden_to_user_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_library_hidden_to_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "_library_hidden_to_user"("library_id", "user_id")
SELECT "A",
    "B"
FROM "_LibraryToUser";
DROP TABLE "_LibraryToUser";
CREATE TABLE "_library_to_tag" (
    "library_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "_library_to_tag_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_library_to_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "_library_to_tag"("library_id", "tag_id")
SELECT "A",
    "B"
FROM "_LibraryToTag";
DROP TABLE "_LibraryToTag";
CREATE TABLE "_media_to_tag" (
    "media_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "_media_to_tag_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_media_to_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "_media_to_tag"("media_id", "tag_id")
SELECT "A",
    "B"
FROM "_MediaToTag";
DROP TABLE "_MediaToTag";
CREATE TABLE "_series_to_tag" (
    "series_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "_series_to_tag_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_series_to_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "_series_to_tag"("series_id", "tag_id")
SELECT "A",
    "B"
FROM "_SeriesToTag";
DROP TABLE "_SeriesToTag";
-- Prisma seemed to handle some non-nullable cols strangely (e.g., like setting `updated_at` on insert) _without_ default values on the column. So we need to adjust those:
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "extension" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" DATETIME,
    "hash" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "series_id" TEXT,
    "deleted_at" DATETIME,
    "koreader_hash" TEXT,
    CONSTRAINT "media_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media"(
        "id",
        "name",
        "size",
        "extension",
        "pages",
        "updated_at",
        "created_at",
        "modified_at",
        "hash",
        "path",
        "status",
        "series_id",
        "deleted_at",
        "koreader_hash"
    )
SELECT "id",
    "name",
    "size",
    "extension",
    "pages",
    "updated_at",
    "created_at",
    "modified_at",
    "hash",
    "path",
    "status",
    "series_id",
    "deleted_at",
    "koreader_hash"
FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media"
    RENAME TO "media";
-- We don't need UUIDs for metadata:
CREATE TABLE "new_media_metadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "age_rating" INTEGER,
    CONSTRAINT "media_metadata_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_metadata"(
        "title",
        "series",
        "number",
        "volume",
        "summary",
        "notes",
        "genre",
        "year",
        "month",
        "day",
        "writers",
        "pencillers",
        "inkers",
        "colorists",
        "letterers",
        "cover_artists",
        "editors",
        "publisher",
        "links",
        "characters",
        "teams",
        "page_count",
        "media_id",
        "age_rating"
    )
SELECT "title",
    "series",
    "number",
    "volume",
    "summary",
    "notes",
    "genre",
    "year",
    "month",
    "day",
    "writers",
    "pencillers",
    "inkers",
    "colorists",
    "letterers",
    "cover_artists",
    "editors",
    "publisher",
    "links",
    "characters",
    "teams",
    "page_count",
    "media_id",
    "age_rating"
FROM "media_metadata";
DROP TABLE "media_metadata";
ALTER TABLE "new_media_metadata"
    RENAME TO "media_metadata";
PRAGMA foreign_keys = ON;
COMMIT;