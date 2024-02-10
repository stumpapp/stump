-- CreateTable
CREATE TABLE "notifiers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "config" BLOB NOT NULL
);
