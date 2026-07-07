import { Api } from '@stump/sdk'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestDb, dbProxy, type TestDb } from '~/__tests__/utils/db'
import { downloadedFiles, readProgress, syncStatus } from '~/db/schema'

vi.mock('@stump/graphql', () => ({
	graphql: vi.fn((q) => q),
}))

vi.mock('~/db', async () => {
	const { createDbMock } = await import('~/__tests__/utils/db')
	return createDbMock()
})

const loadPushProgressFn = () =>
	import('../pushLocalProgress').then((m) => m.executePushProgressSync)

const SERVER_ID = 'server-1'
const BOOK_ID = 'book-1'

async function seedBook(db: TestDb, bookId = BOOK_ID) {
	await db.insert(downloadedFiles).values({
		id: bookId,
		filename: `${bookId}.epub`,
		uri: `/books/${bookId}.epub`,
		serverId: SERVER_ID,
		downloadedAt: new Date(),
	})
}

async function seedProgress(
	db: TestDb,
	overrides: {
		bookId?: string
		syncStatus?: string
		elapsedSeconds?: number
		lastSyncedElapsedSeconds?: number
	} = {},
) {
	await db.insert(readProgress).values({
		bookId: overrides.bookId ?? BOOK_ID,
		serverId: SERVER_ID,
		page: 5,
		elapsedSeconds: overrides.elapsedSeconds ?? 300,
		lastSyncedElapsedSeconds: overrides.lastSyncedElapsedSeconds ?? 200,
		percentage: '0.25',
		syncStatus: overrides.syncStatus ?? syncStatus.enum.UNSYNCED,
		lastModified: new Date(),
	})
}

function makeMockApi(opts: { shouldFail?: boolean } = {}) {
	return {
		execute: opts.shouldFail
			? vi.fn().mockRejectedValue(new Error('network error'))
			: vi.fn().mockResolvedValue({ updateMediaProgress: { __typename: 'MediaProgress' } }),
	} as unknown as Api
}

beforeEach(() => {
	vi.clearAllMocks()
	dbProxy.current = createTestDb()
})

describe('what gets pushed', () => {
	it('pushes UNSYNCED records and marks them SYNCED on success', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, { syncStatus: syncStatus.enum.UNSYNCED })

		const api = makeMockApi()
		const results = await executePushProgressSync({ [SERVER_ID]: api })

		expect(results[SERVER_ID]!.syncedCount).toBe(1)
		expect(results[SERVER_ID]!.failureCount).toBe(0)
		expect(api.execute).toHaveBeenCalledOnce()

		const after = await db
			.select()
			.from(readProgress)
			.where(eq(readProgress.bookId, BOOK_ID))
			.then((r) => r[0])
		expect(after!.syncStatus).toBe(syncStatus.enum.SYNCED)
	})

	it('pushes ERROR records', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, { syncStatus: syncStatus.enum.ERROR })

		const api = makeMockApi()
		const results = await executePushProgressSync({ [SERVER_ID]: api })

		expect(results[SERVER_ID]!.syncedCount).toBe(1)
		expect(api.execute).toHaveBeenCalledOnce()
	})

	it.each([syncStatus.enum.SYNCING, syncStatus.enum.SYNCED])('skips %s records', async (status) => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, { syncStatus: status })

		const api = makeMockApi()
		const results = await executePushProgressSync({ [SERVER_ID]: api })

		expect(results[SERVER_ID]!.syncedCount).toBe(0)
		expect(api.execute).not.toHaveBeenCalled()
	})

	it('respects ignoreBookIds and skips pushing those', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, { syncStatus: syncStatus.enum.UNSYNCED })

		const api = makeMockApi()
		const results = await executePushProgressSync({ [SERVER_ID]: api }, [BOOK_ID])

		expect(results[SERVER_ID]!.syncedCount).toBe(0)
		expect(api.execute).not.toHaveBeenCalled()
	})
})

describe('errors', () => {
	it('marks record as ERROR when the push call fails', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, { syncStatus: syncStatus.enum.UNSYNCED })

		const api = makeMockApi({ shouldFail: true })
		const results = await executePushProgressSync({ [SERVER_ID]: api })

		expect(results[SERVER_ID]!.failureCount).toBe(1)
		expect(results[SERVER_ID]!.syncedCount).toBe(0)

		const after = await db
			.select()
			.from(readProgress)
			.where(eq(readProgress.bookId, BOOK_ID))
			.then((r) => r[0])
		expect(after!.syncStatus).toBe(syncStatus.enum.ERROR)
	})

	it('continues to push records after a failure', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		const BOOK_ID_2 = 'book-2'
		await seedBook(db, BOOK_ID)
		await seedBook(db, BOOK_ID_2)
		await seedProgress(db, { syncStatus: syncStatus.enum.UNSYNCED })
		await seedProgress(db, { bookId: BOOK_ID_2, syncStatus: syncStatus.enum.UNSYNCED })

		let callCount = 0
		const api = {
			execute: vi.fn().mockImplementation(() => {
				callCount++
				if (callCount === 1) return Promise.reject(new Error('network error'))
				return Promise.resolve({ updateMediaProgress: { __typename: 'MediaProgress' } })
			}),
		} as unknown as Api

		const results = await executePushProgressSync({ [SERVER_ID]: api })

		expect(results[SERVER_ID]!.failureCount).toBe(1)
		expect(results[SERVER_ID]!.syncedCount).toBe(1)
	})
})

describe('elapsedSeconds delta', () => {
	it('updates lastSyncedElapsedSeconds to current elapsedSeconds after a successful push', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, {
			syncStatus: syncStatus.enum.UNSYNCED,
			elapsedSeconds: 500,
			lastSyncedElapsedSeconds: 200,
		})

		const api = makeMockApi()
		await executePushProgressSync({ [SERVER_ID]: api })

		const after = await db
			.select()
			.from(readProgress)
			.where(eq(readProgress.bookId, BOOK_ID))
			.then((r) => r[0])
		expect(after!.lastSyncedElapsedSeconds).toBe(500)
	})

	it('sends a positive elapsedSecondsDelta (current minus last synced)', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, {
			syncStatus: syncStatus.enum.UNSYNCED,
			elapsedSeconds: 500,
			lastSyncedElapsedSeconds: 200,
		})

		const api = makeMockApi()
		await executePushProgressSync({ [SERVER_ID]: api })

		const payload = (api.execute as ReturnType<typeof vi.fn>).mock.calls[0]![1] as {
			input: { paged: { elapsedSecondsDelta?: number } }
		}
		expect(payload.input.paged.elapsedSecondsDelta).toBe(300)
	})

	it('omits elapsedSecondsDelta when elapsed has not increased', async () => {
		const db = dbProxy.current
		const executePushProgressSync = await loadPushProgressFn()

		await seedBook(db)
		await seedProgress(db, {
			syncStatus: syncStatus.enum.UNSYNCED,
			elapsedSeconds: 200,
			lastSyncedElapsedSeconds: 200,
		})

		const api = makeMockApi()
		await executePushProgressSync({ [SERVER_ID]: api })

		const payload = (api.execute as ReturnType<typeof vi.fn>).mock.calls[0]![1] as {
			input: { paged: { elapsedSecondsDelta?: number } }
		}
		expect(payload.input.paged.elapsedSecondsDelta).toBeUndefined()
	})
})
