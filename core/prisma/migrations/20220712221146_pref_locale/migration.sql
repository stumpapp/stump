-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reduceAnimations" BOOLEAN NOT NULL DEFAULT false,
    "libraryViewMode" TEXT NOT NULL DEFAULT 'GRID',
    "seriesViewMode" TEXT NOT NULL DEFAULT 'GRID',
    "collectionViewMode" TEXT NOT NULL DEFAULT 'GRID',
    "locale" TEXT NOT NULL DEFAULT 'en'
);
INSERT INTO "new_user_preferences" ("collectionViewMode", "id", "libraryViewMode", "reduceAnimations", "seriesViewMode") SELECT "collectionViewMode", "id", "libraryViewMode", "reduceAnimations", "seriesViewMode" FROM "user_preferences";
DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
