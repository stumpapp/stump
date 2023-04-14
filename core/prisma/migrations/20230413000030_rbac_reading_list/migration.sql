-- CreateTable
CREATE TABLE "reading_list_rules" (
    "role" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "reading_list_id" TEXT NOT NULL,
    CONSTRAINT "reading_list_rules_reading_list_id_fkey" FOREIGN KEY ("reading_list_id") REFERENCES "reading_lists" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_libraries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "library_options_id" TEXT NOT NULL,
    CONSTRAINT "libraries_library_options_id_fkey" FOREIGN KEY ("library_options_id") REFERENCES "library_options" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_libraries" ("description", "id", "library_options_id", "name", "path", "status", "updated_at") SELECT "description", "id", "library_options_id", "name", "path", "status", "updated_at" FROM "libraries";
DROP TABLE "libraries";
ALTER TABLE "new_libraries" RENAME TO "libraries";
CREATE UNIQUE INDEX "libraries_name_key" ON "libraries"("name");
CREATE UNIQUE INDEX "libraries_path_key" ON "libraries"("path");
CREATE UNIQUE INDEX "libraries_library_options_id_key" ON "libraries"("library_options_id");
CREATE TABLE "new_reading_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "creating_user_id" TEXT NOT NULL,
    CONSTRAINT "reading_lists_creating_user_id_fkey" FOREIGN KEY ("creating_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reading_lists" ("creating_user_id", "description", "id", "name", "updated_at") SELECT "creating_user_id", "description", "id", "name", "updated_at" FROM "reading_lists";
DROP TABLE "reading_lists";
ALTER TABLE "new_reading_lists" RENAME TO "reading_lists";
CREATE UNIQUE INDEX "reading_lists_creating_user_id_name_key" ON "reading_lists"("creating_user_id", "name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "reading_list_rules_user_id_reading_list_id_key" ON "reading_list_rules"("user_id", "reading_list_id");
