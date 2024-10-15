/*
  Warnings:

  - You are about to drop the `book_club_chat_boards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_club_chat_message_likes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `book_club_chat_messages` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "book_club_books" ADD COLUMN "image_url" TEXT;

-- AlterTable
ALTER TABLE "book_club_member_favorite_books" ADD COLUMN "image_url" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_club_chat_boards";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_club_chat_message_likes";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "book_club_chat_messages";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "book_club_discussions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "book_club_book_id" TEXT NOT NULL,
    CONSTRAINT "book_club_discussions_book_club_book_id_fkey" FOREIGN KEY ("book_club_book_id") REFERENCES "book_club_books" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_discussion_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_top_message" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" DATETIME,
    "parent_message_id" TEXT,
    "discussion_id" TEXT NOT NULL,
    "member_id" TEXT,
    CONSTRAINT "book_club_discussion_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "book_club_discussion_messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "book_club_discussion_messages_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "book_club_discussions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_discussion_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_discussion_message_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liked_by_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    CONSTRAINT "book_club_discussion_message_likes_liked_by_id_fkey" FOREIGN KEY ("liked_by_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_discussion_message_likes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "book_club_discussion_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "book_club_discussions_book_club_book_id_key" ON "book_club_discussions"("book_club_book_id");
