-- CreateTable
CREATE TABLE "page_resolutions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resolutions" TEXT NOT NULL,
    "metadata_id" TEXT NOT NULL,
    CONSTRAINT "page_resolutions_metadata_id_fkey" FOREIGN KEY ("metadata_id") REFERENCES "media_metadata" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "page_resolutions_metadata_id_key" ON "page_resolutions"("metadata_id");
