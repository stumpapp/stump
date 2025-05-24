import { queryClient, useGraphQLMutation, useSDK } from '@stump/client'
import { useCallback, useMemo } from 'react'

import { useEpubReaderContext } from '../context'
import { BookmarkInput, graphql } from '@stump/graphql'

const create_mutation = graphql(`
	mutation CreateOrUpdateBookmark($input: BookmarkInput!) {
		createOrUpdateBookmark(input: $input) {
			__typename
		}
	}
`)

const delete_mutation = graphql(`
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
		// TODO(graphql): invalid graphql queries
		() => queryClient.invalidateQueries({ queryKey: [sdk.epub.keys.getBookmarks, bookId] }),
		[bookId, sdk.epub],
	)

	const { mutate: createMutation, isPending: isCreating } = useGraphQLMutation(create_mutation, {
		onSuccess: (_) => {
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
			epubcfi: epubcfi,
			mediaId: bookId,
			previewContent: preview,
		}

		return payload
	}, [cfiRange, getCfiPreviewText])

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
			if (resolvedPayload.epubcfi) {
				createMutation({ input: resolvedPayload })
			}
		},
		[createMutation, createPayload],
	)

	const { mutate: deleteMutation, isPending: isDeleting } = useGraphQLMutation(delete_mutation)

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
