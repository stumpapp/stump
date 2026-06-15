import { ReadthroughRecord, ResumeReadingCursor } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestDb, dbProxy, type TestDb } from '~/__tests__/utils/db'
import { downloadedFiles, readProgress, syncStatus } from '~/db/schema'

vi.mock('@sentry/react-native', () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}))

vi.mock('@stump/graphql', () => ({
	graphql: vi.fn((q) => q),
}))

vi.mock('~/db', async () => {
	const { createDbMock } = await import('~/__tests__/utils/db')
	return createDbMock()
})

// we import dynamically so that the mocked db is in place. not overly ideal, but figuring out
// how to test the database without a full disgusting mock was a bit of a headache
const loadPullProgressFn = () =>
	import('../pullServerProgress').then((m) => m.executeSingleServerPullSync)

const SERVER_ID = 'server-1'
const BOOK_ID = 'book-1'
const OLDER_DATE = '2026-06-01T00:00:00.000Z'
const NEWER_DATE = '2026-06-03T00:00:00.000Z'

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
		lastModified?: Date
	} = {},
) {
	await db.insert(readProgress).values({
		bookId: overrides.bookId ?? BOOK_ID,
		serverId: SERVER_ID,
		page: 5,
		elapsedSeconds: overrides.elapsedSeconds ?? 300,
		lastSyncedElapsedSeconds: overrides.lastSyncedElapsedSeconds ?? 300,
		percentage: '0.25',
		syncStatus: overrides.syncStatus ?? syncStatus.enum.SYNCED,
		lastModified: overrides.lastModified ?? new Date(OLDER_DATE),
	})
}

type FakeServerMedia = {
	id: string
	readProgress: Omit<ResumeReadingCursor, '__typename' | 'readthroughNumber'> | null
	readHistory: Array<Pick<ReadthroughRecord, 'completedAt'>>
}

function makeServerMedia(overrides: Partial<FakeServerMedia> = {}) {
	return {
		id: overrides.id ?? BOOK_ID,
		readProgress:
			overrides.readProgress !== undefined
				? overrides.readProgress
				: {
						page: 10,
						percentageCompleted: '0.5',
						epubcfi: null,
						updatedAt: NEWER_DATE,
						elapsedSeconds: 600,
						locator: null,
					},
		readHistory: overrides.readHistory ?? [],
	} as FakeServerMedia
}

function makeMockApi(serverMedia: FakeServerMedia[]) {
	return {
		execute: vi.fn().mockResolvedValue({
			media: { nodes: serverMedia },
		}),
	} as unknown as Api
}

beforeEach(() => {
	vi.clearAllMocks()
	dbProxy.current = createTestDb()
})

describe('conflict resolution', () => {
	it.each([syncStatus.enum.UNSYNCED, syncStatus.enum.SYNCING, syncStatus.enum.ERROR])(
		'leaves local record unchanged when syncStatus is %s and local timestamp is newer',
		async (status) => {
			const db = dbProxy.current
			const executeSingleServerPullSync = await loadPullProgressFn()

			await seedBook(db)
			await seedProgress(db, { syncStatus: status, lastModified: new Date(NEWER_DATE) })

			const originalRecord = await db
				.select()
				.from(readProgress)
				.where(eq(readProgress.bookId, BOOK_ID))
				.then((r) => r[0])

			// server is older than local
			const api = makeMockApi([
				makeServerMedia({
					readProgress: {
						page: 10,
						percentageCompleted: '0.5',
						epubcfi: null,
						updatedAt: OLDER_DATE,
						elapsedSeconds: 600,
						locator: null,
					},
				}),
			])
			const result = await executeSingleServerPullSync(SERVER_ID, api as never)

			expect(result.failedBookIds).toHaveLength(0)

			const afterRecord = await db
				.select()
				.from(readProgress)
				.where(eq(readProgress.bookId, BOOK_ID))
				.then((r) => r[0])
			expect(afterRecord).toEqual(originalRecord) // no change
		},
	)

	it.each([syncStatus.enum.UNSYNCED, syncStatus.enum.SYNCING, syncStatus.enum.ERROR])(
		'overwrites local record when syncStatus is %s but server timestamp is newer',
		async (status) => {
			const db = dbProxy.current
			const executeSingleServerPullSync = await loadPullProgressFn()

			await seedBook(db)
			await seedProgress(db, { syncStatus: status, lastModified: new Date(OLDER_DATE) })

			// server is newer than local
			const api = makeMockApi([makeServerMedia()])
			await executeSingleServerPullSync(SERVER_ID, api as never)

			const after = await db
				.select()
				.from(readProgress)
				.where(eq(readProgress.bookId, BOOK_ID))
				.then((r) => r[0])

			expect(after!.page).toBe(10)
			expect(after!.elapsedSeconds).toBe(600)
			expect(after!.syncStatus).toBe(syncStatus.enum.SYNCED)
		},
	)

	it('applies the server record when local syncStatus is SYNCED and the server is newer', async () => {
		const db = dbProxy.current
		const executeSingleServerPullSync = await loadPullProgressFn()

		await seedBook(db)
		await seedProgress(db, {
			syncStatus: syncStatus.enum.SYNCED,
			elapsedSeconds: 300,
		})

		const api = makeMockApi([makeServerMedia()]) // 1 hour ahead
		await executeSingleServerPullSync(SERVER_ID, api as never)

		const after = await db
			.select()
			.from(readProgress)
			.where(eq(readProgress.bookId, BOOK_ID))
			.then((r) => r[0])

		expect(after).toBeTruthy()
		expect(after!.page).toBe(10)
		expect(after!.elapsedSeconds).toBe(600)
		expect(after!.syncStatus).toBe(syncStatus.enum.SYNCED)
	})

	it('creates a local record when no progress exists yet', async () => {
		const db = dbProxy.current
		const executeSingleServerPullSync = await loadPullProgressFn()

		await seedBook(db)

		const api = makeMockApi([makeServerMedia()])
		await executeSingleServerPullSync(SERVER_ID, api as never)

		const records = await db.select().from(readProgress).where(eq(readProgress.bookId, BOOK_ID))
		expect(records).toHaveLength(1)
		expect(records[0]!.page).toBe(10)
	})
})

describe('completed books', () => {
	// TODO: this is how it works but perhaps it would be better to preserve it until the book is deleted
	it('deletes local progress when the server reports the book as completed and the completion is more recent', async () => {
		const db = dbProxy.current
		const executeSingleServerPullSync = await loadPullProgressFn()

		await seedBook(db)
		await seedProgress(db, { lastModified: new Date(OLDER_DATE) })

		const api = makeMockApi([
			makeServerMedia({
				readProgress: null,
				readHistory: [{ completedAt: NEWER_DATE }],
			}),
		])
		await executeSingleServerPullSync(SERVER_ID, api as never)

		const records = await db.select().from(readProgress).where(eq(readProgress.bookId, BOOK_ID))
		expect(records).toHaveLength(0)
	})

	it('preserves local progress when local read is more recent than the server completion', async () => {
		const db = dbProxy.current
		const executeSingleServerPullSync = await loadPullProgressFn()

		await seedBook(db)
		// local is more recent than the server completion
		await seedProgress(db, { lastModified: new Date(NEWER_DATE) })

		const api = makeMockApi([
			makeServerMedia({
				readHistory: [{ completedAt: OLDER_DATE }],
			}),
		])
		await executeSingleServerPullSync(SERVER_ID, api as never)

		const records = await db.select().from(readProgress).where(eq(readProgress.bookId, BOOK_ID))
		expect(records).toHaveLength(1)
	})
})

describe('lastSyncedElapsedSeconds tracking', () => {
	it('sets lastSyncedElapsedSeconds to the server elapsedSeconds after a pull', async () => {
		const db = dbProxy.current
		const executeSingleServerPullSync = await loadPullProgressFn()

		await seedBook(db)
		await seedProgress(db, { syncStatus: syncStatus.enum.SYNCED, elapsedSeconds: 300 })

		const api = makeMockApi([
			makeServerMedia({
				readProgress: {
					page: 20,
					percentageCompleted: '0.75',
					epubcfi: null,
					updatedAt: NEWER_DATE,
					elapsedSeconds: 900,
					locator: null,
				},
			}),
		])
		await executeSingleServerPullSync(SERVER_ID, api as never)

		const after = await db
			.select()
			.from(readProgress)
			.where(eq(readProgress.bookId, BOOK_ID))
			.then((r) => r[0])

		expect(after).toBeTruthy()
		expect(after!.elapsedSeconds).toBe(900)
		expect(after!.lastSyncedElapsedSeconds).toBe(900)
	})

	it('sets lastSyncedElapsedSeconds equal to elapsedSeconds on a fresh pull with no prior record', async () => {
		const db = dbProxy.current
		const executeSingleServerPullSync = await loadPullProgressFn()

		await seedBook(db)

		const api = makeMockApi([
			makeServerMedia({
				readProgress: {
					page: 1,
					percentageCompleted: '0.1',
					epubcfi: null,
					updatedAt: NEWER_DATE,
					elapsedSeconds: 120,
					locator: null,
				},
			}),
		])
		await executeSingleServerPullSync(SERVER_ID, api as never)

		const after = await db
			.select()
			.from(readProgress)
			.where(eq(readProgress.bookId, BOOK_ID))
			.then((r) => r[0])

		expect(after).toBeTruthy()
		expect(after!.lastSyncedElapsedSeconds).toBe(after!.elapsedSeconds)
	})
})
