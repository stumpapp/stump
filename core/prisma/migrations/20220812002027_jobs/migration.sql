-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "taskCount" INTEGER NOT NULL DEFAULT 1,
    "completedTaskCount" INTEGER NOT NULL DEFAULT 0,
    "secondsElapsed" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT,
    CONSTRAINT "logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_logs" ("createdAt", "id", "level", "message") SELECT "createdAt", "id", "level", "message" FROM "logs";
DROP TABLE "logs";
ALTER TABLE "new_logs" RENAME TO "logs";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
