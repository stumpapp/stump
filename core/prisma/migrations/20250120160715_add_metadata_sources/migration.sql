-- CreateTable
CREATE TABLE "MetadataSources" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL,
    "config" TEXT
);
