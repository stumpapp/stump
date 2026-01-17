import { useMutation } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useCallback } from 'react'

import { db } from '~/db/client'
import { bookmarks as bookmarksTable, syncStatus } from '~/db/schema'
import type { ReadiumLocator } from '~/modules/readium'

type UseLocalBookmarkMutationsParams = {
	bookId: string
	serverId: string
}

type CreateBookmarkParams = {
	locator: ReadiumLocator
	previewContent?: string
}

export function useLocalBookmarkMutations({ bookId, serverId }: UseLocalBookmarkMutationsParams) {
	const { mutateAsync: createBookmarkMutation } = useMutation({
		mutationFn: async ({ locator, previewContent }: CreateBookmarkParams) => {
			const [inserted] = await db
				.insert(bookmarksTable)
				.values({
					bookId,
					serverId,
					href: locator.href,
					chapterTitle: locator.chapterTitle,
					epubcfi: locator.locations?.partialCfi,
					locations: locator.locations,
					previewContent,
					syncStatus: syncStatus.enum.UNSYNCED,
				})
				.returning({ id: bookmarksTable.id })
			return { id: String(inserted?.id || '') }
		},
		onError: (error) => {
			console.error('Failed to create offline bookmark:', error)
		},
	})

	const { mutateAsync: deleteBookmarkMutation } = useMutation({
		mutationFn: async (bookmarkId: string) => {
			await db
				.update(bookmarksTable)
				.set({
					deletedAt: new Date(),
					syncStatus: syncStatus.enum.UNSYNCED,
				})
				.where(eq(bookmarksTable.id, parseInt(bookmarkId, 10)))
		},
		onError: (error) => {
			console.error('Failed to delete offline bookmark:', error)
		},
	})

	const createBookmark = useCallback(
		async (locator: ReadiumLocator, previewContent?: string) => {
			return createBookmarkMutation({ locator, previewContent })
		},
		[createBookmarkMutation],
	)

	const deleteBookmark = useCallback(
		async (bookmarkId: string) => {
			await deleteBookmarkMutation(bookmarkId)
		},
		[deleteBookmarkMutation],
	)

	return {
		createBookmark,
		deleteBookmark,
	}
}
