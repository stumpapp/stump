/**
 * shared test database utilities since working with drizzle in tests is really really annoying
 *
 * but why use better-sqlite3 aaron? see https://github.com/drizzle-team/drizzle-orm/issues/435
 * but tldr; not all drivers expose a `mock` function, and better-sqlite3 runs within node
 * which vitest runs in, and so this lets us create an in-mem db for tests. not great but
 * i guess not the end of the world
 *
 * copypasta:
 *
 * ```ts
 * import { createTestDb, dbProxy, type TestDb } from '~/__tests__/utils/db'
 *
 * vi.mock('~/db', async () => {
 *   const { createDbMock } = await import('~/__tests__/utils/db')
 *   return createDbMock()
 * })
 *
 * beforeEach(() => { dbProxy.current = createTestDb() })
 * ```
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import fs from 'fs'
import path from 'path'

import * as schema from '~/db/schema'

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'drizzle')

function splitMigration(sql: string): string[] {
	return (
		sql
			// drizzle separates statements with `--> statement-breakpoint` comments
			// so we split on it to run each separately
			.split(/--> statement-breakpoint/)
			.map((s) => s.trim())
			.filter(Boolean)
			.filter((s) => !/^INSERT\s+INTO\s+.+\s+SELECT\s+/i.test(s))
	)
}

/**
 * create an in-memory database and apply migrations
 */
export function createTestDb() {
	const sqlite = new Database(':memory:')

	const files = fs
		.readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort() // should be fine, files are padded (e.g., 0001)

	for (const file of files) {
		const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
		for (const stmt of splitMigration(sql)) {
			sqlite.exec(stmt)
		}
	}

	return drizzle(sqlite, { schema })
}

export type TestDb = ReturnType<typeof createTestDb>

export const dbProxy: { current: TestDb } = { current: null! }

/**
 * returns the module shape for easy mocking of `~/db`, e.g.,
 *
 * ```ts
 * vi.mock('~/db', async () => {
 *   const { createDbMock } = await import('~/__tests__/utils/db')
 *   return createDbMock()
 * })
 * ```
 */
export async function createDbMock() {
	const schema = await import('~/db/schema')
	return {
		...schema,
		get db() {
			return dbProxy.current
		},
	}
}
