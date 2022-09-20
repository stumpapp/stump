-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "user_preferences_id" TEXT,
    CONSTRAINT "users_user_preferences_id_fkey" FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "libraries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "updated_at" DATETIME NOT NULL,
    "library_options_id" TEXT NOT NULL,
    CONSTRAINT "libraries_library_options_id_fkey" FOREIGN KEY ("library_options_id") REFERENCES "library_options" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "library_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "convert_rar_to_zip" BOOLEAN NOT NULL DEFAULT false,
    "hard_delete_conversions" BOOLEAN NOT NULL DEFAULT false,
    "create_webp_thumbnails" BOOLEAN NOT NULL DEFAULT false,
    "library_id" TEXT
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "library_id" TEXT,
    CONSTRAINT "series_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" INTEGER NOT NULL,
    "extension" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "series_id" TEXT,
    CONSTRAINT "media_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "reading_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL,
    "creating_user_id" TEXT NOT NULL,
    CONSTRAINT "reading_lists_creating_user_id_fkey" FOREIGN KEY ("creating_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reading_list_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "reading_list_id" TEXT NOT NULL,
    CONSTRAINT "reading_list_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reading_list_access_reading_list_id_fkey" FOREIGN KEY ("reading_list_id") REFERENCES "reading_lists" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "read_progresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" INTEGER NOT NULL,
    "epubcfi" TEXT,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "read_progresses_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "read_progresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "task_count" INTEGER NOT NULL DEFAULT 1,
    "completed_task_count" INTEGER NOT NULL DEFAULT 0,
    "ms_elapsed" BIGINT NOT NULL DEFAULT 0,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "job_id" TEXT,
    CONSTRAINT "logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "library_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "series_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "collection_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en'
);

-- CreateTable
CREATE TABLE "server_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "_LibraryToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LibraryToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LibraryToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SeriesToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SeriesToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SeriesToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MediaToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MediaToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MediaToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_preferences_id_key" ON "users"("user_preferences_id");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_name_key" ON "libraries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_path_key" ON "libraries"("path");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_library_options_id_key" ON "libraries"("library_options_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "reading_lists_creating_user_id_name_key" ON "reading_lists"("creating_user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "reading_list_access_user_id_reading_list_id_key" ON "reading_list_access"("user_id", "reading_list_id");

-- CreateIndex
CREATE UNIQUE INDEX "read_progresses_user_id_media_id_key" ON "read_progresses"("user_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "_LibraryToTag_AB_unique" ON "_LibraryToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_LibraryToTag_B_index" ON "_LibraryToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SeriesToTag_AB_unique" ON "_SeriesToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_SeriesToTag_B_index" ON "_SeriesToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MediaToTag_AB_unique" ON "_MediaToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_MediaToTag_B_index" ON "_MediaToTag"("B");
