/*
  Warnings:

  - You are about to drop the column `expires_at` on the `sessions` table. All the data in the column will be lost.
  - Added the required column `expiry_time` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_time" DATETIME NOT NULL,
    "data" BLOB NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Note: I have commented out the following line because the underlying blob data is not compatible with the new schema, so to avoid
-- loading data which will error out, the sessions data will be lost. Not a huge deal, people will just have to log in again.
-- INSERT INTO "new_sessions" ("created_at", "data", "id", "user_id") SELECT "created_at", "data", "id", "user_id" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
