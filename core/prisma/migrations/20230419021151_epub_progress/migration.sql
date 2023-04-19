-- AlterTable
ALTER TABLE "read_progresses" ADD COLUMN "completed_at" DATETIME;
ALTER TABLE "read_progresses" ADD COLUMN "percentage_completed" REAL;

-- CreateTable
CREATE TABLE "MediaAnnotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "epubcfi" TEXT,
    "text" TEXT,
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    CONSTRAINT "MediaAnnotation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaAnnotation_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
