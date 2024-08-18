import { Text } from '@stump/components'
import React, { useCallback, useMemo } from 'react'

import GenericEmptyState from '@/components/GenericEmptyState'

import { useEpubReaderContext } from '../context'

type Props = {
	onLocationChanged?: () => void
}
export default function Bookmarks({ onLocationChanged }: Props) {
	const {
		readerMeta: { bookMeta },
		controls: { onLinkClick },
	} = useEpubReaderContext()

	const bookmarks = useMemo(() => bookMeta?.bookmarks || {}, [bookMeta])
	const bookmarksArray = useMemo(
		() => Object.values(bookmarks).filter((bookmark) => !!bookmark.epubcfi),
		[bookmarks],
	)

	const handleSelect = useCallback(
		(href: string) => {
			onLinkClick(href)
			onLocationChanged?.()
		},
		[onLinkClick, onLocationChanged],
	)

	if (!bookmarksArray.length) {
		return <GenericEmptyState title="No bookmarks" />
	}

	return (
		<div className="flex max-h-full flex-col divide-y divide-edge overflow-y-auto px-2 scrollbar-hide">
			{bookmarksArray.map(({ preview_content, epubcfi }) => (
				<button
					key={epubcfi}
					className="flex flex-col justify-start gap-1.5 p-2 px-1 py-1.5 text-left hover:bg-background-surface"
					onClick={() => handleSelect(epubcfi as string)}
					disabled={!epubcfi?.length}
				>
					<Text variant="muted" size="xs">
						{epubcfi}
					</Text>
					<Text size="sm">{preview_content}</Text>
				</button>
			))}
		</div>
	)
}
