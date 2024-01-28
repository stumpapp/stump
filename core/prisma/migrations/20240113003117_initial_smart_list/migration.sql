-- CreateTable
CREATE TABLE "smart_list_access_rules" (
    "role" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "smart_list_id" TEXT NOT NULL,
    CONSTRAINT "smart_list_access_rules_smart_list_id_fkey" FOREIGN KEY ("smart_list_id") REFERENCES "smart_lists" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "smart_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" BLOB NOT NULL,
    "joiner" TEXT NOT NULL DEFAULT 'AND',
    "default_grouping" TEXT NOT NULL DEFAULT 'BY_BOOKS',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "creator_id" TEXT NOT NULL,
    CONSTRAINT "smart_lists_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "smart_list_views" (
    "name" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    CONSTRAINT "smart_list_views_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "smart_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "smart_list_access_rules_user_id_smart_list_id_key" ON "smart_list_access_rules"("user_id", "smart_list_id");

-- CreateIndex
CREATE UNIQUE INDEX "smart_lists_creator_id_name_key" ON "smart_lists"("creator_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "smart_list_views_list_id_name_key" ON "smart_list_views"("list_id", "name");
