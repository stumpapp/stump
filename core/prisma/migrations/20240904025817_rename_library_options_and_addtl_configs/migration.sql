BEGIN TRANSACTION;

-- CreateTable
CREATE TABLE "library_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "library_pattern" TEXT NOT NULL DEFAULT 'SERIES_BASED',
    "convert_rar_to_zip" BOOLEAN NOT NULL DEFAULT false,
    "hard_delete_conversions" BOOLEAN NOT NULL DEFAULT false,
    "generate_file_hashes" BOOLEAN NOT NULL DEFAULT false,
    "process_metadata" BOOLEAN NOT NULL DEFAULT true,
    "thumbnail_config" BLOB,
    "ignore_rules" BLOB,
    "library_id" TEXT
);
INSERT INTO "library_configs" (
    "convert_rar_to_zip",
    "hard_delete_conversions",
    "id",
    "library_id",
    "library_pattern",
    "thumbnail_config"
  )
SELECT "convert_rar_to_zip",
  "hard_delete_conversions",
  "id",
  "library_id",
  "library_pattern",
  "thumbnail_config"
FROM "library_options";

/*
  Warnings:

  - You are about to drop the `library_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `library_options_id` on the `libraries` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "library_options";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_libraries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emoji" TEXT,
    "config_id" TEXT DEFAULT '',
    "job_schedule_config_id" TEXT,
    CONSTRAINT "libraries_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "library_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "libraries_job_schedule_config_id_fkey" FOREIGN KEY ("job_schedule_config_id") REFERENCES "job_schedule_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_libraries" ("created_at", "description", "emoji", "id", "config_id", "job_schedule_config_id", "name", "path", "status", "updated_at") SELECT "created_at", "description", "emoji", "id", "library_options_id", "job_schedule_config_id", "name", "path", "status", "updated_at" FROM "libraries";
DROP TABLE "libraries";
ALTER TABLE "new_libraries" RENAME TO "libraries";
CREATE UNIQUE INDEX "libraries_name_key" ON "libraries"("name");
CREATE UNIQUE INDEX "libraries_path_key" ON "libraries"("path");
CREATE UNIQUE INDEX "libraries_config_id_key" ON "libraries"("config_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

COMMIT;
