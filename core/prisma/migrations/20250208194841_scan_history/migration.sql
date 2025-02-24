-- AlterTable
ALTER TABLE "libraries" ADD COLUMN "last_scanned_at" DATETIME;

-- CreateTable
CREATE TABLE "library_scan_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "options" BLOB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "library_id" TEXT NOT NULL,
    "job_id" TEXT,
    CONSTRAINT "library_scan_records_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "library_scan_records_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "library_scan_records_job_id_key" ON "library_scan_records"("job_id");
