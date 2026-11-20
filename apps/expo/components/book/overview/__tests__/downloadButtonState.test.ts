import { describe, expect, it } from 'vitest'

import { getDownloadButtonState } from '../downloadButtonState'

const bookId = 'book-1'
const serverId = 'server-1'
const queueItem = { bookId, serverId }

describe('getDownloadButtonState', () => {
	it('returns queued for a matching pending download', () => {
		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: false,
				pendingItems: [queueItem],
				activeItems: [],
			}),
		).toBe('queued')
	})

	it('shows the same queue item transition from queued to downloading', () => {
		let pendingItems = [queueItem]
		let activeItems: typeof pendingItems = []

		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: false,
				pendingItems,
				activeItems,
			}),
		).toBe('queued')

		pendingItems = []
		activeItems = [queueItem]

		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: false,
				pendingItems,
				activeItems,
			}),
		).toBe('downloading')
	})

	it('returns completed for a downloaded book', () => {
		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: true,
				pendingItems: [queueItem],
				activeItems: [queueItem],
			}),
		).toBe('completed')
	})

	it('clears an active state on removal unless the book was downloaded', () => {
		const activeItems = [queueItem]
		const removedItems: typeof activeItems = []

		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: false,
				pendingItems: [],
				activeItems,
			}),
		).toBe('downloading')

		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: false,
				pendingItems: [],
				activeItems: removedItems,
			}),
		).toBeUndefined()

		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: true,
				pendingItems: [],
				activeItems: removedItems,
			}),
		).toBe('completed')
	})

	it('does not queue a matching book from a different server', () => {
		expect(
			getDownloadButtonState({
				bookId,
				serverId,
				isDownloaded: false,
				pendingItems: [{ bookId, serverId: 'server-2' }],
				activeItems: [],
			}),
		).toBeUndefined()
	})
})
