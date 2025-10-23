import { useSDK } from '@stump/client'
import { cx } from '@stump/components'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useMemo, useRef } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

import { EntityImage } from '@/components/entity'
import { usePreferences } from '@/hooks/usePreferences'

type Props = {
	selectedPage?: number
	onSelectPage: (page?: number) => void
	bookId: string
	pages: number
}

export default function BookPageGrid({ bookId, pages, selectedPage, onSelectPage }: Props) {
	const parentRef = useRef<HTMLDivElement>(null)

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
					>
						<List
							bookId={bookId}
							pages={pages}
							width={width - 16}
							selectedPage={selectedPage}
							onSelectPage={onSelectPage}
							getScrollElement={() => parentRef.current}
						/>
					</div>
				)}
			</AutoSizer>
		</div>
	)
}

type ListProps = {
	bookId: string
	pages: number
	width: number
	getScrollElement: () => HTMLDivElement | null
} & Pick<Props, 'selectedPage' | 'onSelectPage'>

const List = ({
	bookId,
	pages,
	width,
	selectedPage,
	onSelectPage,
	getScrollElement,
}: ListProps) => {
	const { sdk } = useSDK()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()
	const isAtLeastSmall = useMediaMatch('(min-width: 640px)')
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const colsPerRow = useMemo(() => {
		if (!isAtLeastSmall) {
			return 3
		} else if (!isAtLeastMedium) {
			return 4
		} else {
			return 5
		}
	}, [isAtLeastSmall, isAtLeastMedium])

	const getWidth = useCallback(() => width / colsPerRow, [colsPerRow, width])

	const getSize = useCallback(() => getWidth() / thumbnailRatio, [getWidth, thumbnailRatio])

	const rowVirtualizer = useVirtualizer({
		count: Math.ceil(pages / Math.floor(width / getWidth())),
		estimateSize: getSize,
		getScrollElement,
		overscan: 5,
	})

	return (
		<div
			style={{
				height: `${rowVirtualizer.getTotalSize()}px`,
				position: 'relative',
				width: '100%',
			}}
		>
			{rowVirtualizer.getVirtualItems().map((virtualRow) => {
				const startIndex = virtualRow.index * colsPerRow
				const endIndex = Math.min(startIndex + colsPerRow, pages)
				const pagesInRow = Array.from(
					{ length: endIndex - startIndex },
					(_, i) => startIndex + i + 1,
				)

				return (
					<div
						key={virtualRow.index}
						style={{
							height: `${virtualRow.size}px`,
							left: 0,
							position: 'absolute',
							top: `${virtualRow.start}px`,
							width: '100%',
						}}
					>
						<div className="flex gap-2">
							{pagesInRow.map((pageNumber) => {
								const imageUrl = sdk.media.bookPageURL(bookId, pageNumber)

								return (
									<EntityImage
										key={pageNumber}
										src={imageUrl}
										className={cx(
											'h-auto rounded-md object-cover transition-colors duration-100',
											pageNumber === selectedPage
												? 'ring-2 ring-edge-brand'
												: 'ring-1 ring-edge hover:ring-edge-brand',
										)}
										style={{
											width: `${getWidth() - 8}px`,
											aspectRatio: thumbnailRatio,
										}}
										onClick={() => onSelectPage(pageNumber)}
									/>
								)
							})}
						</div>
					</div>
				)
			})}
		</div>
	)
}
