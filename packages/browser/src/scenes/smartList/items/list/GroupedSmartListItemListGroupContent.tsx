import { getMediaThumbnail } from '@stump/api'
import { Accordion, cn, Text } from '@stump/components'
import { Media } from '@stump/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import React from 'react'
import { Link } from 'react-router-dom'

import { usePreferences } from '@/hooks'
import paths from '@/paths'

export const ACCORDION_CONTENT_ITEM_HEIGHT = 64

type Props = {
	books: Media[]
	maxHeight?: number
}

export default function GroupedSmartListItemListGroupContent({ books }: Props) {
	const scrollRef = React.useRef<HTMLDivElement>(null)

	const rowVirtualizer = useVirtualizer({
		count: books.length,
		estimateSize: React.useCallback(() => ACCORDION_CONTENT_ITEM_HEIGHT, []),
		getScrollElement: () => scrollRef.current,
		overscan: 5,
	})

	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	return (
		<Accordion.Content>
			<div
				ref={scrollRef}
				className={cn('h-full w-full overflow-y-auto', { 'scrollbar-hide': enable_hide_scrollbar })}
				// FIXME: this will virtualize the inner content, but the parent size is not being calculated correctly
				// style={{
				// 	height: maxHeight,
				// }}
			>
				<div
					style={{
						height: `${rowVirtualizer.getTotalSize()}px`,
					}}
					className="relative"
				>
					{rowVirtualizer
						.getVirtualItems()
						.map(({ key, start, index, size }) => {
							const book = books[index]
							if (!book) {
								return null
							}

							const { name, metadata } = book

							const resolvedName = metadata?.title || name

							return (
								<div
									key={key}
									style={{
										height: `${size}px`,
										left: 0,
										position: 'absolute',
										top: 0,
										transform: `translateY(${start}px)`,
										width: '100%',
									}}
								>
									<Link
										to={paths.bookOverview(book.id)}
										className="flex h-full w-full items-center px-2 hover:bg-background-surface"
									>
										<img className="h-12 w-auto rounded-sm" src={getMediaThumbnail(book.id)} />
										<div className="flex flex-1 flex-col space-y-1.5 self-start px-2 pt-2">
											<Text size="sm" className="line-clamp-1">
												{resolvedName}
											</Text>
										</div>
									</Link>
								</div>
							)
						})
						.filter(Boolean)}
				</div>
			</div>
		</Accordion.Content>
	)
}
