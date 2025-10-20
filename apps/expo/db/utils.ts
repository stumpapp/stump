import { rawDb } from './client'

/**
 * Delete the database files from the filesystem
 */
export async function deleteDatabase(__DEV__: boolean) {
	if (!__DEV__) {
		throw new Error('Database deletion is only allowed in development mode')
	}

	await rawDb.execAsync(`PRAGMA writable_schema = 1;`)
	await rawDb.execAsync(`DELETE FROM sqlite_master WHERE type IN ('table', 'index', 'trigger');`)
	await rawDb.execAsync(`PRAGMA writable_schema = 0;`)
	await rawDb.execAsync(`VACUUM;`)
	await rawDb.execAsync(`PRAGMA integrity_check;`)
}
