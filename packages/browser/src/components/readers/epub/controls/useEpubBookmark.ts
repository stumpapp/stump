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

/** Create and delete bookmarks for the Readium EPUB reader using locators. */
export function useEpubBookmark() {
	const {
		readerMeta: {
			bookEntity: { id: bookId },
			bookMeta,
		},
		controls: { getLocatorPreviewText },
	} = useEpubReaderContext()

	const chapterMeta = bookMeta?.chapter
	const currentLocator = chapterMeta?.currentLocator
	const existingBookmarks = useMemo(() => bookMeta?.bookmarks ?? {}, [bookMeta?.bookmarks])

	const currentBookmark = useMemo(() => {
		if (!currentLocator?.href) return undefined
		return Object.values(existingBookmarks).find(
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
	}, [existingBookmarks, currentLocator])

	const onSuccess = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['readiumWebReader', bookId], exact: false })
	}, [bookId])

	const { mutate: createMutation, isPending: isCreating } = useGraphQLMutation(_createMutation, {
		onSuccess,
	})

	const createPayload = useCallback((): BookmarkInput | null => {
		if (!currentLocator?.href) return null

		const preview = getLocatorPreviewText(currentLocator)
		return {
			locator: {
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
			mediaId: bookId,
			previewContent: preview ?? undefined,
		}
	}, [currentLocator, getLocatorPreviewText, bookId])

	const createBookmark = useCallback(
		(payload?: BookmarkInput) => {
			if (!createMutation) return
			const resolvedPayload = payload ?? createPayload()
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
	const canBookmarkCurrent = !!currentLocator?.href && !currentIsBookmarked
	const isUnknownLocation = !currentLocator?.href

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
