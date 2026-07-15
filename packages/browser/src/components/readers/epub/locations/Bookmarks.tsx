import { Text } from '@stump/components'
import { useCallback, useMemo } from 'react'

import GenericEmptyState from '@/components/GenericEmptyState'

import { useEpubReaderContext } from '../context'

type Props = {
	onLocationChanged?: () => void
}

export default function Bookmarks({ onLocationChanged }: Props) {
	const {
		readerMeta: { bookMeta },
		controls: { onGoToLocator, onGoToCfi },
	} = useEpubReaderContext()

	const bookmarks = useMemo(() => Object.values(bookMeta?.bookmarks || {}), [bookMeta])

	const handleSelectLocator = useCallback(
		(bookmark: (typeof bookmarks)[number]) => {
			if (bookmark.locator?.href) {
				onGoToLocator({
					href: bookmark.locator.href,
					type: bookmark.locator.type || 'application/xhtml+xml',
					title: bookmark.locator.title ?? undefined,
					chapterTitle: bookmark.locator.chapterTitle,
					locations: bookmark.locator.locations,
					text: bookmark.locator.text,
				})
				onLocationChanged?.()
			} else if (bookmark.epubcfi && onGoToCfi) {
				onGoToCfi(bookmark.epubcfi)
				onLocationChanged?.()
			}
		},
		[onGoToLocator, onGoToCfi, onLocationChanged],
	)

	if (!bookmarks.length) {
		return <GenericEmptyState title="No bookmarks" />
	}

	return (
		<div className="px-2 scrollbar-hide flex max-h-full flex-col divide-y divide-border overflow-y-auto">
			{bookmarks.map((bookmark) => {
				const key = bookmark.id
				const subtitle =
					bookmark.locator?.chapterTitle || bookmark.locator?.href || bookmark.epubcfi || 'Bookmark'
				return (
					<button
						key={key}
						className="gap-1.5 p-2 px-1 py-1.5 flex flex-col justify-start text-left hover:bg-muted"
						onClick={() => handleSelectLocator(bookmark)}
						disabled={!bookmark.locator?.href && !bookmark.epubcfi}
					>
						<Text variant="muted" size="xs" className="line-clamp-1">
							{subtitle}
						</Text>
						{bookmark.previewContent && <Text size="sm">{bookmark.previewContent}</Text>}
					</button>
				)
			})}
		</div>
	)
}
