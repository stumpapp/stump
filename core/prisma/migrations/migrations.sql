-- CreateTable
CREATE TABLE "migrations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "migrations_checksum_key" ON "migrations"("checksum");