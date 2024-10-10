import { queryClient, useMutation, useSDK } from '@stump/client'
import { CreateOrUpdateBookmark, DeleteBookmark } from '@stump/sdk'
import { useCallback, useMemo } from 'react'

import { useEpubReaderContext } from '../context'

/**
 * A hook for creating and deleting bookmarks within an epub reader
 */
export function useEpubBookmark() {
	const { sdk } = useSDK()
	const {
		readerMeta: {
			bookEntity: { id: bookId },
			bookMeta,
		},
		controls: { getCfiPreviewText },
	} = useEpubReaderContext()

	const chapterMeta = bookMeta?.chapter
	const cfiRange = useMemo(
		() => (chapterMeta?.cfiRange.filter(Boolean) ?? []) as string[],
		[chapterMeta],
	)
	const isUnknownCfiRange = cfiRange.length === 0

	const existingBookmarks = useMemo(() => bookMeta?.bookmarks ?? {}, [bookMeta?.bookmarks])
	const currentBookmark = useMemo(
		() => existingBookmarks[cfiRange[0] ?? ''] ?? existingBookmarks[cfiRange[1] ?? ''],
		[existingBookmarks, cfiRange],
	)

	/**
	 * A callback to invalidate the bookmarks query after a bookmark is created or deleted
	 */
	const onSuccess = useCallback(
		() => queryClient.invalidateQueries({ queryKey: [sdk.epub.keys.getBookmarks, bookId] }),
		[bookId, sdk.epub],
	)

	/**
	 * Create a payload for creating or deleting a bookmark based on the current
	 * chapter's cfi range.
	 */
	const createPayload = useCallback(async () => {
		const epubcfi = cfiRange[0] ?? cfiRange[1] ?? ''
		const preview = await getCfiPreviewText(epubcfi)
		return {
			epubcfi,
			preview_content: preview,
		}
	}, [cfiRange, getCfiPreviewText])

	const { mutate: createMutation, isLoading: isCreating } = useMutation(
		[sdk.epub.keys.createBookmark, bookId],
		async (payload: CreateOrUpdateBookmark) => sdk.epub.createBookmark(bookId, payload),
		{
			onSuccess,
		},
	)

	/**
	 * Create a bookmark for a specific epubcfi. If no epubcfi payload is provided,
	 * the current chapter's cfi range will be used.
	 */
	const createBookmark = useCallback(
		async (payload?: CreateOrUpdateBookmark) => {
			const resolvedPayload = payload ?? (await createPayload())
			if (resolvedPayload.epubcfi) {
				createMutation(resolvedPayload)
			}
		},
		[createMutation, createPayload],
	)

	const { mutate: deleteMutation, isLoading: isDeleting } = useMutation(
		[sdk.epub.keys.deleteBookmark, bookId],
		async (payload: DeleteBookmark) => sdk.epub.deleteBookmark(bookId, payload),
		{
			onSuccess,
		},
	)

	/**
	 * Create a payload for creating or deleting a bookmark based on the current
	 * chapter's cfi range
	 */
	const deletePayload = useCallback(() => {
		if (currentBookmark?.epubcfi) {
			return {
				epubcfi: currentBookmark.epubcfi,
			}
		} else {
			return null
		}
	}, [currentBookmark])

	/**
	 * Delete a bookmark for a specific epubcfi. If no epubcfi payload is provided,
	 * the current chapter's cfi range will be used
	 */
	const deleteBookmark = useCallback(
		(payload = deletePayload()) => {
			if (payload?.epubcfi) {
				deleteMutation(payload)
			}
		},
		[deleteMutation, deletePayload],
	)

	const currentIsBookmarked = useMemo(() => !!currentBookmark, [currentBookmark])
	const canBookmarkCurrent = useMemo(
		() => !isUnknownCfiRange && !currentIsBookmarked,
		[isUnknownCfiRange, currentIsBookmarked],
	)

	return {
		/**
		 * Whether or not the current chapter can be bookmarked
		 */
		canBookmarkCurrent,
		createBookmark,
		/**
		 * Whether or not the current chapter is bookmarked
		 */
		currentIsBookmarked,
		deleteBookmark,
		/**
		 * Whether or not a create bookmark mutation is currently in progress
		 */
		isCreating,
		/**
		 * Whether or not a delete bookmark mutation is currently in progress
		 */
		isDeleting,
		/**
		 * Whether or not the current chapter's cfi range is unknown. This is used
		 * to determine whether or not to disable the bookmark button
		 */
		isUnknownCfiRange,
	}
}
