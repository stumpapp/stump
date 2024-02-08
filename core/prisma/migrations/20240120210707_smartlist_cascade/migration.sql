-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_smart_list_access_rules" (
    "role" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "smart_list_id" TEXT NOT NULL,
    CONSTRAINT "smart_list_access_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "smart_list_access_rules_smart_list_id_fkey" FOREIGN KEY ("smart_list_id") REFERENCES "smart_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_smart_list_access_rules" ("role", "smart_list_id", "user_id") SELECT "role", "smart_list_id", "user_id" FROM "smart_list_access_rules";
DROP TABLE "smart_list_access_rules";
ALTER TABLE "new_smart_list_access_rules" RENAME TO "smart_list_access_rules";
CREATE UNIQUE INDEX "smart_list_access_rules_user_id_smart_list_id_key" ON "smart_list_access_rules"("user_id", "smart_list_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
