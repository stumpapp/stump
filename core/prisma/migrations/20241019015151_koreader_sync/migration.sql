-- AlterTable
ALTER TABLE "media" ADD COLUMN "koreader_hash" TEXT;

-- CreateTable
CREATE TABLE "RegisteredReadingDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_finished_reading_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "started_at" DATETIME NOT NULL,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    CONSTRAINT "finished_reading_sessions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "finished_reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "finished_reading_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "RegisteredReadingDevice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_finished_reading_sessions" ("completed_at", "id", "media_id", "started_at", "user_id") SELECT "completed_at", "id", "media_id", "started_at", "user_id" FROM "finished_reading_sessions";
DROP TABLE "finished_reading_sessions";
ALTER TABLE "new_finished_reading_sessions" RENAME TO "finished_reading_sessions";
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
    CONSTRAINT "reading_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "RegisteredReadingDevice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reading_sessions" ("epubcfi", "id", "media_id", "page", "percentage_completed", "started_at", "updated_at", "user_id") SELECT "epubcfi", "id", "media_id", "page", "percentage_completed", "started_at", "updated_at", "user_id" FROM "reading_sessions";
DROP TABLE "reading_sessions";
ALTER TABLE "new_reading_sessions" RENAME TO "reading_sessions";
CREATE UNIQUE INDEX "reading_sessions_user_id_media_id_key" ON "reading_sessions"("user_id", "media_id");
CREATE TABLE "new_library_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "convert_rar_to_zip" BOOLEAN NOT NULL DEFAULT false,
    "hard_delete_conversions" BOOLEAN NOT NULL DEFAULT false,
    "default_reading_dir" TEXT NOT NULL DEFAULT 'ltr',
    "default_reading_mode" TEXT NOT NULL DEFAULT 'paged',
    "default_reading_image_scale_fit" TEXT NOT NULL DEFAULT 'height',
    "generate_file_hashes" BOOLEAN NOT NULL DEFAULT false,
    "generate_koreader_hashes" BOOLEAN NOT NULL DEFAULT false,
    "process_metadata" BOOLEAN NOT NULL DEFAULT true,
    "library_pattern" TEXT NOT NULL DEFAULT 'SERIES_BASED',
    "thumbnail_config" BLOB,
    "ignore_rules" BLOB,
    "library_id" TEXT
);
INSERT INTO "new_library_configs" ("convert_rar_to_zip", "default_reading_dir", "default_reading_image_scale_fit", "default_reading_mode", "generate_file_hashes", "hard_delete_conversions", "id", "ignore_rules", "library_id", "library_pattern", "process_metadata", "thumbnail_config") SELECT "convert_rar_to_zip", "default_reading_dir", "default_reading_image_scale_fit", "default_reading_mode", "generate_file_hashes", "hard_delete_conversions", "id", "ignore_rules", "library_id", "library_pattern", "process_metadata", "thumbnail_config" FROM "library_configs";
DROP TABLE "library_configs";
ALTER TABLE "new_library_configs" RENAME TO "library_configs";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredReadingDevice_name_key" ON "RegisteredReadingDevice"("name");
