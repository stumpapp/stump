import { useCallback, useState } from 'react'

import { useEpubLocationStore } from '~/stores/epub'

import { useEpubReaderContext } from './context'

export function useBookmark() {
	const [isLoading, setIsLoading] = useState(false)

	const { onBookmark, onDeleteBookmark } = useEpubReaderContext()

	const book = useEpubLocationStore((state) => state.book)
	const locator = useEpubLocationStore((state) => state.locator)
	const addBookmark = useEpubLocationStore((state) => state.addBookmark)
	const removeBookmark = useEpubLocationStore((state) => state.removeBookmark)
	const isCurrentLocationBookmarked = useEpubLocationStore((state) =>
		state.isCurrentLocationBookmarked(),
	)
	const getCurrentLocationBookmark = useEpubLocationStore((state) =>
		state.getCurrentLocationBookmark(),
	)

	const handleToggleBookmark = useCallback(async () => {
		if (!locator || !book || isLoading) return

		setIsLoading(true)

		try {
			if (isCurrentLocationBookmarked) {
				const existingBookmark = getCurrentLocationBookmark
				if (existingBookmark && onDeleteBookmark) {
					await onDeleteBookmark(existingBookmark.id)
					removeBookmark(existingBookmark.id)
				}
			} else if (onBookmark) {
				const previewText = locator.text?.highlight || locator.chapterTitle || undefined
				const result = await onBookmark(locator, previewText)
				if (result?.id) {
					addBookmark({
						__typename: 'Bookmark',
						id: result.id,
						href: locator.href,
						chapterTitle: locator.chapterTitle,
						locations: locator.locations,
						epubcfi: locator.locations?.partialCfi,
						previewContent: locator.text?.highlight,
						mediaId: book.id,
						createdAt: new Date(),
					})
				}
			}
		} catch (error) {
			console.error('Failed to toggle bookmark:', error)
		} finally {
			setIsLoading(false)
		}
	}, [
		locator,
		book,
		isLoading,
		isCurrentLocationBookmarked,
		getCurrentLocationBookmark,
		onBookmark,
		onDeleteBookmark,
		addBookmark,
		removeBookmark,
	])

	return {
		isBookmarked: isCurrentLocationBookmarked,
		disabled: isLoading || !locator || !book || !onBookmark,
		toggleBookmark: handleToggleBookmark,
	}
}
