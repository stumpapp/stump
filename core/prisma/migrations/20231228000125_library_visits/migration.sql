-- CreateTable
CREATE TABLE "LastLibraryVisit" (
    "user_id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LastLibraryVisit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LastLibraryVisit_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preferred_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "app_theme" TEXT NOT NULL DEFAULT 'LIGHT',
    "primary_navigation_mode" TEXT NOT NULL DEFAULT 'SIDEBAR',
    "show_query_indicator" BOOLEAN NOT NULL DEFAULT false,
    "enable_discord_presence" BOOLEAN NOT NULL DEFAULT false,
    "enable_compact_display" BOOLEAN NOT NULL DEFAULT false,
    "enable_double_sidebar" BOOLEAN NOT NULL DEFAULT true,
    "enable_replace_primary_sidebar" BOOLEAN NOT NULL DEFAULT false,
    "prefer_accent_color" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT
);
INSERT INTO "new_user_preferences" ("app_theme", "enable_compact_display", "enable_discord_presence", "enable_double_sidebar", "enable_replace_primary_sidebar", "id", "locale", "prefer_accent_color", "preferred_layout_mode", "show_query_indicator", "user_id") SELECT "app_theme", "enable_compact_display", "enable_discord_presence", "enable_double_sidebar", "enable_replace_primary_sidebar", "id", "locale", "prefer_accent_color", "preferred_layout_mode", "show_query_indicator", "user_id" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "LastLibraryVisit_user_id_library_id_key" ON "LastLibraryVisit"("user_id", "library_id");
