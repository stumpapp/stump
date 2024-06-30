-- CreateTable
CREATE TABLE "page_dimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dimensions" TEXT NOT NULL,
    "metadata_id" TEXT NOT NULL,
    CONSTRAINT "page_dimensions_metadata_id_fkey" FOREIGN KEY ("metadata_id") REFERENCES "media_metadata" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "page_dimensions_metadata_id_key" ON "page_dimensions"("metadata_id");
