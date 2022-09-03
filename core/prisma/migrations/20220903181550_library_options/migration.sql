/*
  Warnings:

  - Added the required column `libraryOptionsId` to the `libraries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "library_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "convertRarToZip" BOOLEAN NOT NULL DEFAULT false,
    "hardDeleteConversions" BOOLEAN NOT NULL DEFAULT false,
    "createWebpThumbnails" BOOLEAN NOT NULL DEFAULT false,
    "libraryId" TEXT
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_libraries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "updatedAt" DATETIME NOT NULL,
    "libraryOptionsId" TEXT NOT NULL,
    CONSTRAINT "libraries_libraryOptionsId_fkey" FOREIGN KEY ("libraryOptionsId") REFERENCES "library_options" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_libraries" ("description", "id", "name", "path", "status", "updatedAt") SELECT "description", "id", "name", "path", "status", "updatedAt" FROM "libraries";
DROP TABLE "libraries";
ALTER TABLE "new_libraries" RENAME TO "libraries";
CREATE UNIQUE INDEX "libraries_name_key" ON "libraries"("name");
CREATE UNIQUE INDEX "libraries_path_key" ON "libraries"("path");
CREATE UNIQUE INDEX "libraries_libraryOptionsId_key" ON "libraries"("libraryOptionsId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;