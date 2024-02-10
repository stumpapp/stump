/*
  Warnings:

  - You are about to drop the `LastLibraryVisit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `completed_task_count` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `extra_metadata` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `task_count` on the `jobs` table. All the data in the column will be lost.
  - The primary key for the `logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `logs` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `logs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- DropIndex
DROP INDEX "LastLibraryVisit_user_id_library_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LastLibraryVisit";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "last_library_visits" (
    "user_id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "last_library_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "last_library_visits_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "save_state" BLOB,
    "output_data" BLOB,
    "ms_elapsed" BIGINT NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME
);
INSERT INTO "new_jobs" ("completed_at", "created_at", "description", "id", "ms_elapsed", "name", "status") SELECT "completed_at", "created_at", "description", "id", "ms_elapsed", "name", "status" FROM "jobs";
DROP TABLE "jobs";
ALTER TABLE "new_jobs" RENAME TO "jobs";
CREATE TABLE "new_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "job_id" TEXT,
    CONSTRAINT "logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_logs" ("id", "job_id", "level", "message") SELECT "id", "job_id", "level", "message" FROM "logs";
DROP TABLE "logs";
ALTER TABLE "new_logs" RENAME TO "logs";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "last_library_visits_user_id_library_id_key" ON "last_library_visits"("user_id", "library_id");
