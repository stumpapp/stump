import { getMediaThumbnail } from '@stump/api'
import { useMediaCursorQuery } from '@stump/client'
import { Media } from '@stump/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import React, { useCallback, useEffect } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

type Props = {
	seriesId: string
	onSelectBook: (book: Media) => void
}
// TODO: Create generlized VirtualizedGrid component and trim the reused logic
export default function SeriesBookGrid({ seriesId, onSelectBook }: Props) {
	const {
		media: books,
		fetchNextPage,
		hasNextPage,
	} = useMediaCursorQuery({
		limit: 50,
		params: {
			series: {
				id: seriesId,
			},
		},
	})

	const parentRef = React.useRef<HTMLDivElement>(null)

	const isAtLeastSmall = useMediaMatch('(min-width: 640px)')
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const estimateWidth = useCallback(() => {
		if (!isAtLeastSmall) {
			return 112
		} else if (!isAtLeastMedium) {
			return 122
		} else {
			return 144
		}
	}, [isAtLeastSmall, isAtLeastMedium])

	const rowCount = books.length > 4 ? books.length / 4 : 1
	const rowVirtualizer = useVirtualizer({
		count: rowCount,
		// ratio is 2:3, so we take the result of estimateWidth and multiply by 3/2
		estimateSize: useCallback(() => estimateWidth() * 1.5, [estimateWidth]),
		getScrollElement: () => parentRef.current,
		overscan: 5,
	})

	const columnCount = books.length > 4 ? 4 : books.length
	const columnVirtualizer = useVirtualizer({
		count: columnCount,
		estimateSize: estimateWidth,
		getScrollElement: () => parentRef.current,
		horizontal: true,
		overscan: 5,
	})

	useEffect(
		() => {
			rowVirtualizer.measure()
			columnVirtualizer.measure()
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isAtLeastMedium, isAtLeastSmall],
	)

	const handleScroll = () => {
		if (!hasNextPage) return

		const { scrollHeight, scrollTop, clientHeight } = parentRef.current!

		if (scrollHeight - scrollTop === clientHeight) {
			fetchNextPage()
		}
	}

	return (
		<div className="h-96 w-full flex-1">
			<AutoSizer>
				{({ height, width }) => (
					<div
						ref={parentRef}
						className="overflow-y-auto overflow-x-hidden"
						style={{
							height,
							width,
						}}
						onScroll={handleScroll}
					>
						<div
							style={{
								height: `${rowVirtualizer.getTotalSize()}px`,
								position: 'relative',
								width: `${columnVirtualizer.getTotalSize()}px`,
							}}
						>
							{rowVirtualizer.getVirtualItems().map((virtualRow) => (
								<React.Fragment key={virtualRow.index}>
									{columnVirtualizer.getVirtualItems().map((virtualColumn) => {
										const virtualPage = virtualRow.index * 4 + virtualColumn.index + 1
										const book = books[virtualPage - 1]
										const imageUrl = getMediaThumbnail(book?.id || '')
										return (
											<div
												key={virtualColumn.index}
												style={{
													height: `${virtualRow.size}px`,
													left: 0,
													position: 'absolute',
													top: 0,
													transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`,
													width: `${virtualColumn.size}px`,
												}}
											>
												<div
													className="relative flex w-[7rem] flex-1 flex-col space-y-1 overflow-hidden rounded-md border-[1.5px] border-edge-subtle bg-background shadow-sm transition-colors duration-100 hover:border-brand sm:w-[7.666rem] md:w-[9rem]"
													onClick={() => onSelectBook(book!)}
												>
													<div
														className="relative aspect-[2/3] bg-cover bg-center p-0"
														style={{
															backgroundImage: `url('${imageUrl}')`,
														}}
													/>
												</div>
											</div>
										)
									})}
								</React.Fragment>
							))}
						</div>
					</div>
				)}
			</AutoSizer>
		</div>
	)
}
