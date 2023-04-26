-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "avatar_url" TEXT,
    "last_login" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    "user_preferences_id" TEXT,
    CONSTRAINT "users_user_preferences_id_fkey" FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("avatar_url", "hashed_password", "id", "last_login", "role", "user_preferences_id", "username") SELECT "avatar_url", "hashed_password", "id", "last_login", "role", "user_preferences_id", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_user_preferences_id_key" ON "users"("user_preferences_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
