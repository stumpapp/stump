-- CreateTable
CREATE TABLE "user_login_activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "authentication_successful" BOOLEAN NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "user_login_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_schedule_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interval_secs" INTEGER NOT NULL DEFAULT 86400
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_server_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_schedule_config_id" TEXT,
    CONSTRAINT "server_preferences_job_schedule_config_id_fkey" FOREIGN KEY ("job_schedule_config_id") REFERENCES "job_schedule_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_server_preferences" ("id") SELECT "id" FROM "server_preferences";
DROP TABLE "server_preferences";
ALTER TABLE "new_server_preferences" RENAME TO "server_preferences";
CREATE UNIQUE INDEX "server_preferences_job_schedule_config_id_key" ON "server_preferences"("job_schedule_config_id");
CREATE TABLE "new_libraries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "library_options_id" TEXT NOT NULL,
    "job_schedule_config_id" TEXT,
    CONSTRAINT "libraries_library_options_id_fkey" FOREIGN KEY ("library_options_id") REFERENCES "library_options" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "libraries_job_schedule_config_id_fkey" FOREIGN KEY ("job_schedule_config_id") REFERENCES "job_schedule_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_libraries" ("created_at", "description", "id", "library_options_id", "name", "path", "status", "updated_at") SELECT "created_at", "description", "id", "library_options_id", "name", "path", "status", "updated_at" FROM "libraries";
DROP TABLE "libraries";
ALTER TABLE "new_libraries" RENAME TO "libraries";
CREATE UNIQUE INDEX "libraries_name_key" ON "libraries"("name");
CREATE UNIQUE INDEX "libraries_path_key" ON "libraries"("path");
CREATE UNIQUE INDEX "libraries_library_options_id_key" ON "libraries"("library_options_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
