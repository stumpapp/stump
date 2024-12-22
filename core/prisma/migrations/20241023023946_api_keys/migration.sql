-- CreateTable
CREATE TABLE "api_keys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "short_token" TEXT NOT NULL,
    "long_token_hash" TEXT NOT NULL,
    "permissions" BLOB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" DATETIME,
    "expires_at" DATETIME,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
