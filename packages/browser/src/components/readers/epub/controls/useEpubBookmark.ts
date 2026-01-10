import { queryClient, useGraphQLMutation } from '@stump/client'
import { BookmarkInput, graphql } from '@stump/graphql'
import { useCallback, useMemo } from 'react'

import { useEpubReaderContext } from '../context'

const _createMutation = graphql(`
	mutation CreateOrUpdateBookmark($input: BookmarkInput!) {
		createOrUpdateBookmark(input: $input) {
			__typename
		}
	}
`)

const _deleteMutation = graphql(`
	mutation DeleteBookmark($epubcfi: String!) {
		deleteBookmark(epubcfi: $epubcfi) {
			__typename
		}
	}
`)

/**
 * A hook for creating and deleting bookmarks within an epub reader
 */
export function useEpubBookmark() {
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
	 * A callback to invalidate the parent query after a bookmark is created or deleted
	 */
	const onSuccess = useCallback(
		() => queryClient.invalidateQueries({ queryKey: ['epubJsReader', bookId], exact: false }),
		[bookId],
	)

	const { mutate: createMutation, isPending: isCreating } = useGraphQLMutation(_createMutation, {
		onSuccess: () => {
			onSuccess()
		},
	})
	/**
	 * Create a payload for creating or deleting a bookmark based on the current
	 * chapter's cfi range.
	 */
	const createPayload = useCallback(async () => {
		const epubcfi = cfiRange[0] ?? cfiRange[1] ?? ''
		const preview = await getCfiPreviewText(epubcfi)
		const payload: BookmarkInput = {
			locator: {
				epubcfi,
			},
			mediaId: bookId,
			previewContent: preview,
		}

		return payload
	}, [cfiRange, getCfiPreviewText, bookId])

	/**
	 * Create a bookmark for a specific epubcfi. If no epubcfi payload is provided,
	 * the current chapter's cfi range will be used.
	 */
	const createBookmark = useCallback(
		async (payload?: BookmarkInput) => {
			if (!createMutation) {
				return
			}

			const resolvedPayload = payload ?? (await createPayload())
			if (resolvedPayload.locator.epubcfi) {
				createMutation({ input: resolvedPayload })
			}
		},
		[createMutation, createPayload],
	)

	const { mutate: deleteMutation, isPending: isDeleting } = useGraphQLMutation(_deleteMutation)

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
