import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import * as schema from './schema'

// Note: Not sure we really need change listeners now
const expoDb = openDatabaseSync('stump.db', { enableChangeListener: true })

/**
 * Drizzle database client
 */
export const db = drizzle(expoDb, { schema })

/**
 * Note: Only use this for migrations or direct operations **as needed**
 */
export const rawDb = expoDb
