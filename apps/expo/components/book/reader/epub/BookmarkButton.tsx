import { Bookmark, BookmarkCheck } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { useEpubLocationStore } from '~/stores/epub'

type Props = {
	color?: string
}

export default function BookmarkButton({ color }: Props) {
	const [isLoading, setIsLoading] = useState(false)

	const book = useEpubLocationStore((state) => state.book)
	const locator = useEpubLocationStore((state) => state.locator)
	const addBookmark = useEpubLocationStore((state) => state.addBookmark)
	const removeBookmark = useEpubLocationStore((state) => state.removeBookmark)
	const onBookmark = useEpubLocationStore((state) => state.onBookmark)
	const onDeleteBookmark = useEpubLocationStore((state) => state.onDeleteBookmark)
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

	// Don't render if no locator or no bookmark callback
	if (!locator || !book || !onBookmark) return null

	return (
		<Pressable onPress={handleToggleBookmark} disabled={isLoading}>
			{({ pressed }) => (
				<Icon
					as={isCurrentLocationBookmarked ? BookmarkCheck : Bookmark}
					className="h-6 w-6"
					style={{
						opacity: isLoading ? 0.4 : pressed ? 0.7 : 0.9,
						// @ts-expect-error: Color definitely works
						color,
					}}
				/>
			)}
		</Pressable>
	)
}
