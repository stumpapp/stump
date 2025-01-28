-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL COLLATE NOCASE,
    "hashed_password" TEXT NOT NULL,
    "is_server_owner" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" TEXT,
    "last_login" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "max_sessions_allowed" INTEGER,
    "permissions" TEXT,
    "user_preferences_id" TEXT,
    CONSTRAINT "users_user_preferences_id_fkey" FOREIGN KEY ("user_preferences_id") REFERENCES "user_preferences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("avatar_url", "created_at", "deleted_at", "hashed_password", "id", "is_locked", "is_server_owner", "last_login", "max_sessions_allowed", "permissions", "user_preferences_id", "username") SELECT "avatar_url", "created_at", "deleted_at", "hashed_password", "id", "is_locked", "is_server_owner", "last_login", "max_sessions_allowed", "permissions", "user_preferences_id", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_user_preferences_id_key" ON "users"("user_preferences_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
