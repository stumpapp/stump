-- CreateTable
CREATE TABLE "finished_reading_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "started_at" DATETIME NOT NULL,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "finished_reading_sessions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "finished_reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reading_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" INTEGER,
    "percentage_completed" REAL,
    "epubcfi" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "reading_sessions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "reading_sessions_user_id_media_id_key" ON "reading_sessions"("user_id", "media_id");

-- For each record in `read_progresses` that has `is_completed` set to `true`, insert a record into `finished_reading_sessions`
-- Note: Unfortunately there was no `started_at` field in the `read_progresses` table, so we are using the `updated_at` field as a substitute.

-- InsertData
INSERT INTO "finished_reading_sessions" ("id", "started_at", "completed_at", "media_id", "user_id")
SELECT "id", IFNULL("updated_at", CURRENT_TIMESTAMP), IFNULL("completed_at", CURRENT_TIMESTAMP), "media_id", "user_id"
FROM "read_progresses"
WHERE "is_completed" = 1;

-- For each record in `read_progresses` that has `is_completed` set to `false`, insert a record into `reading_sessions`
-- Note: Unfortunately there was no `started_at` field in the `read_progresses` table, so we are using the `updated_at` field as a substitute.

-- InsertData
INSERT OR IGNORE INTO "reading_sessions" ("id", "page", "percentage_completed", "epubcfi", "started_at", "updated_at", "media_id", "user_id")
SELECT "id", "page", "percentage_completed", "epubcfi", IFNULL("updated_at", CURRENT_TIMESTAMP), IFNULL("updated_at", CURRENT_TIMESTAMP), "media_id", "user_id"
FROM "read_progresses"
WHERE "is_completed" = 0;


/*
  Warnings:

  - You are about to drop the `read_progresses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "read_progresses";
PRAGMA foreign_keys=on;
