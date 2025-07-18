import { useSDK } from '@stump/client'
import { Accordion, cn, Text } from '@stump/components'
import { Media } from '@stump/graphql'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'

import { EntityImage } from '@/components/entity'
import { usePreferences } from '@/hooks'
import paths from '@/paths'

export const ACCORDION_CONTENT_ITEM_HEIGHT = 64

type Props = {
	books: Media[]
	maxHeight?: number
}

export default function GroupedSmartListItemListGroupContent({ books }: Props) {
	const { sdk } = useSDK()
	const scrollRef = useRef<HTMLDivElement>(null)

	const rowVirtualizer = useVirtualizer({
		count: books.length,
		estimateSize: useCallback(() => ACCORDION_CONTENT_ITEM_HEIGHT, []),
		getScrollElement: () => scrollRef.current,
		overscan: 5,
	})

	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()

	return (
		<Accordion.Content>
			<div
				ref={scrollRef}
				className={cn('h-full w-full overflow-y-auto', { 'scrollbar-hide': enableHideScrollbar })}
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
										<EntityImage
											className="h-12 w-auto rounded-sm"
											src={sdk.media.thumbnailURL(book.id)}
										/>
										<div className="flex flex-1 flex-col space-y-1.5 self-start px-2 pt-2">
											<Text size="sm" className="line-clamp-1">
												{book.resolvedName}
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
