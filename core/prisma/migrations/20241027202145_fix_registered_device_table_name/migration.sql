/*
  Warnings:

  - You are about to drop the `RegisteredReadingDevice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "RegisteredReadingDevice_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RegisteredReadingDevice";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "registered_reading_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_reading_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" INTEGER,
    "percentage_completed" REAL,
    "epubcfi" TEXT,
    "koreader_progress" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    CONSTRAINT "reading_sessions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reading_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "registered_reading_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reading_sessions" ("device_id", "epubcfi", "id", "koreader_progress", "media_id", "page", "percentage_completed", "started_at", "updated_at", "user_id") SELECT "device_id", "epubcfi", "id", "koreader_progress", "media_id", "page", "percentage_completed", "started_at", "updated_at", "user_id" FROM "reading_sessions";
DROP TABLE "reading_sessions";
ALTER TABLE "new_reading_sessions" RENAME TO "reading_sessions";
CREATE UNIQUE INDEX "reading_sessions_user_id_media_id_key" ON "reading_sessions"("user_id", "media_id");
CREATE TABLE "new_finished_reading_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "started_at" DATETIME NOT NULL,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    CONSTRAINT "finished_reading_sessions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "finished_reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "finished_reading_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "registered_reading_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_finished_reading_sessions" ("completed_at", "device_id", "id", "media_id", "started_at", "user_id") SELECT "completed_at", "device_id", "id", "media_id", "started_at", "user_id" FROM "finished_reading_sessions";
DROP TABLE "finished_reading_sessions";
ALTER TABLE "new_finished_reading_sessions" RENAME TO "finished_reading_sessions";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "registered_reading_devices_name_key" ON "registered_reading_devices"("name");
