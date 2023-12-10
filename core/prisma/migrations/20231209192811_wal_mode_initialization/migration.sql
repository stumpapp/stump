-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_server_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "public_url" TEXT,
    "initial_wal_setup_complete" BOOLEAN NOT NULL DEFAULT false,
    "job_schedule_config_id" TEXT,
    CONSTRAINT "server_config_job_schedule_config_id_fkey" FOREIGN KEY ("job_schedule_config_id") REFERENCES "job_schedule_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_server_config" ("id", "job_schedule_config_id", "public_url") SELECT "id", "job_schedule_config_id", "public_url" FROM "server_config";
DROP TABLE "server_config";
ALTER TABLE "new_server_config" RENAME TO "server_config";
CREATE UNIQUE INDEX "server_config_job_schedule_config_id_key" ON "server_config"("job_schedule_config_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
