/*
  Warnings:

  - You are about to drop the `server_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "server_preferences_job_schedule_config_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "server_preferences";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "reviews_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "member_role_spec" BLOB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "book_club_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "book_club_id" TEXT NOT NULL,
    CONSTRAINT "book_club_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_invitations_book_club_id_fkey" FOREIGN KEY ("book_club_id") REFERENCES "book_clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "display_name" TEXT,
    "is_creator" BOOLEAN NOT NULL DEFAULT false,
    "hide_progress" BOOLEAN NOT NULL,
    "private_membership" BOOLEAN NOT NULL DEFAULT false,
    "role" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_club_id" TEXT NOT NULL,
    CONSTRAINT "book_club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_members_book_club_id_fkey" FOREIGN KEY ("book_club_id") REFERENCES "book_clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_member_favorite_books" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "author" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "member_id" TEXT NOT NULL,
    "book_id" TEXT,
    CONSTRAINT "book_club_member_favorite_books_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_member_favorite_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_schedules" (
    "default_interval_days" INTEGER DEFAULT 30,
    "book_club_id" TEXT NOT NULL PRIMARY KEY,
    CONSTRAINT "book_club_schedules_book_club_id_fkey" FOREIGN KEY ("book_club_id") REFERENCES "book_clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_books" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start_at" DATETIME NOT NULL,
    "end_at" DATETIME NOT NULL,
    "discussion_duration_days" INTEGER DEFAULT 1,
    "title" TEXT,
    "author" TEXT,
    "url" TEXT,
    "book_entity_id" TEXT,
    "book_club_schedule_book_club_id" TEXT,
    CONSTRAINT "book_club_books_book_entity_id_fkey" FOREIGN KEY ("book_entity_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_books_book_club_schedule_book_club_id_fkey" FOREIGN KEY ("book_club_schedule_book_club_id") REFERENCES "book_club_schedules" ("book_club_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_book_suggestions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "author" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "suggested_by_id" TEXT NOT NULL,
    "book_id" TEXT,
    CONSTRAINT "book_club_book_suggestions_suggested_by_id_fkey" FOREIGN KEY ("suggested_by_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_book_suggestions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_book_suggestion_likes" (
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liked_by_id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    CONSTRAINT "book_club_book_suggestion_likes_liked_by_id_fkey" FOREIGN KEY ("liked_by_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_book_suggestion_likes_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "book_club_book_suggestions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_chat_boards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "book_club_book_id" TEXT NOT NULL,
    CONSTRAINT "book_club_chat_boards_book_club_book_id_fkey" FOREIGN KEY ("book_club_book_id") REFERENCES "book_club_books" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_top_message" BOOLEAN NOT NULL DEFAULT true,
    "parent_message_id" TEXT,
    "chat_board_id" TEXT NOT NULL,
    "member_id" TEXT,
    CONSTRAINT "book_club_chat_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "book_club_chat_messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "book_club_chat_messages_chat_board_id_fkey" FOREIGN KEY ("chat_board_id") REFERENCES "book_club_chat_boards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_chat_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_club_chat_message_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liked_by_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    CONSTRAINT "book_club_chat_message_likes_liked_by_id_fkey" FOREIGN KEY ("liked_by_id") REFERENCES "book_club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_club_chat_message_likes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "book_club_chat_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "server_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secret" TEXT NOT NULL,
    "email" TEXT,
    "granted_permissions" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "server_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "public_url" TEXT,
    "job_schedule_config_id" TEXT,
    CONSTRAINT "server_config_job_schedule_config_id_fkey" FOREIGN KEY ("job_schedule_config_id") REFERENCES "job_schedule_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "is_server_owner" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" TEXT,
    "last_login" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT,
    "user_preferences_id" TEXT,
    CONSTRAINT "users_user_preferences_id_fkey" FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("avatar_url", "created_at", "deleted_at", "hashed_password", "id", "is_locked", "last_login", "user_preferences_id", "username") SELECT "avatar_url", "created_at", "deleted_at", "hashed_password", "id", "is_locked", "last_login", "user_preferences_id", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_user_preferences_id_key" ON "users"("user_preferences_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_media_id_key" ON "reviews"("user_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_clubs_name_key" ON "book_clubs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "book_club_invitations_user_id_book_club_id_key" ON "book_club_invitations"("user_id", "book_club_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_club_members_user_id_book_club_id_key" ON "book_club_members"("user_id", "book_club_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_club_member_favorite_books_member_id_key" ON "book_club_member_favorite_books"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_club_book_suggestion_likes_liked_by_id_suggestion_id_key" ON "book_club_book_suggestion_likes"("liked_by_id", "suggestion_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_club_chat_boards_book_club_book_id_key" ON "book_club_chat_boards"("book_club_book_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_config_job_schedule_config_id_key" ON "server_config"("job_schedule_config_id");
