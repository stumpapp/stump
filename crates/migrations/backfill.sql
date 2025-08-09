-- This SQL file is used to 'fix' the data in the database after the migration. BE SURE TO BACKUP BEFORE UPDATING:

-- 1. open the newly migrated database in your preferred SQLite client, I use TablePlus but it doesn't matter. You may also use the CLI e.g. sqlite3 stump.db < resolve-missing-data.sql
--    you must use absolute paths to the databases, replace with your path
ATTACH DATABASE '/replace/with/full/path/to/stump-before-migration.db' as 'backup';

-- 2. run the following SQL to copy the data from the old database to the new database:
BEGIN;
PRAGMA foreign_keys = OFF;

-- TODO: Copy data from the old database to the new database

PRAGMA foreign_keys = ON;
PRAGMA foreign_key_check;
COMMIT;