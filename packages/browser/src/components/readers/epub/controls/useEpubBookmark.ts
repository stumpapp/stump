import { queryClient, useGraphQLMutation } from '@stump/client'
import { BookmarkInput, graphql } from '@stump/graphql'
import { useCallback, useMemo } from 'react'

import { useEpubReaderContext } from '../context'
import { locatorsRoughlyMatch } from '../readium/locator'

const _createMutation = graphql(`
	mutation CreateBookmark($input: BookmarkInput!) {
		createBookmark(input: $input) {
			__typename
		}
	}
`)

const _deleteMutation = graphql(`
	mutation DeleteBookmark($id: String!) {
		deleteBookmark(id: $id) {
			__typename
		}
	}
`)

/**
 * Create and delete bookmarks for the EPUB reader using Readium locators.
 * Legacy CFI-only bookmarks remain listed but are not deleted via this hook,
 * they will be removed soon.
 */
export function useEpubBookmark() {
	const {
		readerMeta: {
			bookEntity: { id: bookId },
			bookMeta,
		},
		controls: { getLocatorPreviewText, getCfiPreviewText },
	} = useEpubReaderContext()

	const chapterMeta = bookMeta?.chapter
	const currentLocator = chapterMeta?.currentLocator
	const cfiRange = useMemo(
		() => (chapterMeta?.cfiRange?.filter(Boolean) ?? []) as string[],
		[chapterMeta],
	)

	const existingBookmarks = useMemo(() => bookMeta?.bookmarks ?? {}, [bookMeta?.bookmarks])

	const currentBookmark = useMemo(() => {
		if (currentLocator?.href) {
			const match = Object.values(existingBookmarks).find(
				(bookmark) =>
					bookmark.locator &&
					locatorsRoughlyMatch(
						{
							href: bookmark.locator.href,
							locations: bookmark.locator.locations,
						},
						currentLocator,
					),
			)
			if (match) return match
		}

		// Legacy epub.js: match by CFI key
		return existingBookmarks[cfiRange[0] ?? ''] ?? existingBookmarks[cfiRange[1] ?? '']
	}, [existingBookmarks, currentLocator, cfiRange])

	const onSuccess = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['readiumWebReader', bookId], exact: false })
		queryClient.invalidateQueries({ queryKey: ['epubJsReader', bookId], exact: false })
	}, [bookId])

	const { mutate: createMutation, isPending: isCreating } = useGraphQLMutation(_createMutation, {
		onSuccess,
	})

	const createPayload = useCallback(async (): Promise<BookmarkInput | null> => {
		if (currentLocator?.href) {
			const preview = await getLocatorPreviewText(currentLocator)
			return {
				locator: {
					readium: {
						chapterTitle: currentLocator.chapterTitle ?? currentLocator.title ?? '',
						href: currentLocator.href,
						title: currentLocator.title,
						type: currentLocator.type || 'application/xhtml+xml',
						locations: currentLocator.locations
							? {
									fragments: currentLocator.locations.fragments ?? undefined,
									progression: currentLocator.locations.progression ?? undefined,
									position: currentLocator.locations.position ?? undefined,
									totalProgression: currentLocator.locations.totalProgression ?? undefined,
								}
							: undefined,
						text: currentLocator.text ?? undefined,
					},
				},
				mediaId: bookId,
				previewContent: preview ?? undefined,
			}
		}

		// Legacy epub.js path
		const epubcfi = cfiRange[0] ?? cfiRange[1] ?? ''
		if (!epubcfi || !getCfiPreviewText) return null
		const preview = await getCfiPreviewText(epubcfi)
		return {
			locator: { epubcfi },
			mediaId: bookId,
			previewContent: preview ?? undefined,
		}
	}, [currentLocator, getLocatorPreviewText, getCfiPreviewText, cfiRange, bookId])

	const createBookmark = useCallback(
		async (payload?: BookmarkInput) => {
			if (!createMutation) return
			const resolvedPayload = payload ?? (await createPayload())
			if (!resolvedPayload) return
			createMutation({ input: resolvedPayload })
		},
		[createMutation, createPayload],
	)

	const { mutate: deleteMutation, isPending: isDeleting } = useGraphQLMutation(_deleteMutation, {
		onSuccess,
	})

	const deleteBookmark = useCallback(() => {
		if (currentBookmark?.id) {
			deleteMutation({ id: currentBookmark.id })
		}
	}, [deleteMutation, currentBookmark])

	const currentIsBookmarked = !!currentBookmark
	const canBookmarkCurrent = !!(currentLocator?.href || cfiRange.length > 0) && !currentIsBookmarked
	const isUnknownLocation = !currentLocator?.href && cfiRange.length === 0

	return {
		canBookmarkCurrent,
		createBookmark,
		currentIsBookmarked,
		deleteBookmark,
		isCreating,
		isDeleting,
		/** @deprecated Use isUnknownLocation — kept for BookmarkToggle compatibility */
		isUnknownCfiRange: isUnknownLocation,
		isUnknownLocation,
	}
}
