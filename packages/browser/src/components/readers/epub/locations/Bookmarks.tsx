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
		controls: { onGoToLocator, onGoToLegacyCfi },
	} = useEpubReaderContext()

	const bookmarks = useMemo(() => Object.values(bookMeta?.bookmarks || {}), [bookMeta])

	const handleSelectLocator = useCallback(
		async (bookmark: (typeof bookmarks)[number]) => {
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
			} else if (bookmark.epubcfi && onGoToLegacyCfi) {
				await onGoToLegacyCfi(bookmark.epubcfi)
				onLocationChanged?.()
			}
		},
		[onGoToLocator, onGoToLegacyCfi, onLocationChanged],
	)

	if (!bookmarks.length) {
		return <GenericEmptyState title="No bookmarks" />
	}

	return (
		<div className="px-2 scrollbar-hide flex max-h-full flex-col divide-y divide-border overflow-y-auto">
			{bookmarks.map((bookmark) => {
				const key = bookmark.id
				const hasLocator = !!bookmark.locator?.href
				const hasLegacyCfi = !!bookmark.epubcfi
				const isNavigable = hasLocator || (hasLegacyCfi && !!onGoToLegacyCfi)
				const subtitle =
					bookmark.locator?.chapterTitle ||
					bookmark.locator?.href ||
					(hasLegacyCfi ? 'Legacy bookmark' : 'Bookmark')

				return (
					<button
						key={key}
						className="gap-1.5 p-2 px-1 py-1.5 flex flex-col justify-start text-left hover:bg-muted disabled:opacity-60"
						onClick={() => void handleSelectLocator(bookmark)}
						disabled={!isNavigable}
						title={
							hasLegacyCfi && !hasLocator
								? 'Legacy CFI bookmark — will be resolved when opened'
								: undefined
						}
					>
						<Text variant="muted" size="xs" className="line-clamp-1">
							{subtitle}
						</Text>
						{bookmark.previewContent && <Text size="sm">{bookmark.previewContent}</Text>}
						{hasLegacyCfi && !hasLocator && (
							<Text variant="muted" size="xs">
								{onGoToLegacyCfi
									? 'Tap to resolve legacy location'
									: 'Location unavailable in this reader'}
							</Text>
						)}
					</button>
				)
			})}
		</div>
	)
}
