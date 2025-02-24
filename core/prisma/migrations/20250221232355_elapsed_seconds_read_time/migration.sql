-- AlterTable
ALTER TABLE "finished_reading_sessions" ADD COLUMN "elapsed_seconds" BIGINT;

-- AlterTable
ALTER TABLE "reading_sessions" ADD COLUMN "elapsed_seconds" BIGINT;
