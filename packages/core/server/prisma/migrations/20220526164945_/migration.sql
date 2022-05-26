-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "userPreferencesId" TEXT,
    CONSTRAINT "users_userPreferencesId_fkey" FOREIGN KEY ("userPreferencesId") REFERENCES "user_preferences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "libraries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "libraryId" TEXT,
    CONSTRAINT "series_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" INTEGER NOT NULL,
    "extension" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "path" TEXT NOT NULL,
    "seriesId" TEXT,
    CONSTRAINT "media_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "updatedAt" DATETIME NOT NULL,
    "creatingUserId" TEXT NOT NULL,
    CONSTRAINT "reading_lists_creatingUserId_fkey" FOREIGN KEY ("creatingUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reading_list_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "readingListId" TEXT NOT NULL,
    CONSTRAINT "reading_list_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reading_list_access_readingListId_fkey" FOREIGN KEY ("readingListId") REFERENCES "reading_lists" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "read_progresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" INTEGER NOT NULL,
    "mediaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "read_progresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "read_progresses_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reduceAnimations" BOOLEAN NOT NULL DEFAULT false,
    "libraryViewMode" TEXT NOT NULL DEFAULT 'GRID',
    "seriesViewMode" TEXT NOT NULL DEFAULT 'GRID',
    "collectionViewMode" TEXT NOT NULL DEFAULT 'GRID'
);

-- CreateTable
CREATE TABLE "server_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "renameSeries" BOOLEAN NOT NULL DEFAULT false,
    "convertCbrToCbz" BOOLEAN NOT NULL DEFAULT false
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
CREATE UNIQUE INDEX "users_userPreferencesId_key" ON "users"("userPreferencesId");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_name_key" ON "libraries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "libraries_path_key" ON "libraries"("path");

-- CreateIndex
CREATE UNIQUE INDEX "media_checksum_key" ON "media"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "reading_lists_creatingUserId_name_key" ON "reading_lists"("creatingUserId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "reading_list_access_userId_readingListId_key" ON "reading_list_access"("userId", "readingListId");

-- CreateIndex
CREATE UNIQUE INDEX "read_progresses_userId_mediaId_key" ON "read_progresses"("userId", "mediaId");

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
