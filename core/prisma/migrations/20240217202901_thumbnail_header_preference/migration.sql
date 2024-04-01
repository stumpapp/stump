-- CreateTable
CREATE TABLE "_LibraryToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LibraryToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "libraries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LibraryToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preferred_layout_mode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "app_theme" TEXT NOT NULL DEFAULT 'LIGHT',
    "primary_navigation_mode" TEXT NOT NULL DEFAULT 'SIDEBAR',
    "layout_max_width_px" INTEGER DEFAULT 1280,
    "show_query_indicator" BOOLEAN NOT NULL DEFAULT false,
    "enable_discord_presence" BOOLEAN NOT NULL DEFAULT false,
    "enable_compact_display" BOOLEAN NOT NULL DEFAULT false,
    "enable_double_sidebar" BOOLEAN NOT NULL DEFAULT true,
    "enable_replace_primary_sidebar" BOOLEAN NOT NULL DEFAULT false,
    "enable_hide_scrollbar" BOOLEAN NOT NULL DEFAULT false,
    "prefer_accent_color" BOOLEAN NOT NULL DEFAULT true,
    "show_thumbnails_in_headers" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT
);
INSERT INTO "new_user_preferences" ("app_theme", "enable_compact_display", "enable_discord_presence", "enable_double_sidebar", "enable_hide_scrollbar", "enable_replace_primary_sidebar", "id", "layout_max_width_px", "locale", "prefer_accent_color", "preferred_layout_mode", "primary_navigation_mode", "show_query_indicator", "user_id") SELECT "app_theme", "enable_compact_display", "enable_discord_presence", "enable_double_sidebar", "enable_hide_scrollbar", "enable_replace_primary_sidebar", "id", "layout_max_width_px", "locale", "prefer_accent_color", "preferred_layout_mode", "primary_navigation_mode", "show_query_indicator", "user_id" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "_LibraryToUser_AB_unique" ON "_LibraryToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_LibraryToUser_B_index" ON "_LibraryToUser"("B");
