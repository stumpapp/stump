import { useSDK } from '@stump/client'
import { cx } from '@stump/components'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Fragment, useCallback, useEffect, useRef } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

type Props = {
	selectedPage?: number
	onSelectPage: (page?: number) => void
	bookId: string
	pages: number
}
// TODO: Create generlized VirtualizedGrid component and trim the reused logic
export default function BookPageGrid({ bookId, pages, selectedPage, onSelectPage }: Props) {
	const { sdk } = useSDK()
	const parentRef = useRef<HTMLDivElement>(null)

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

	const rowCount = pages > 4 ? pages / 4 : 1
	const rowVirtualizer = useVirtualizer({
		count: rowCount,
		// ratio is 2:3, so we take the result of estimateWidth and multiply by 3/2
		estimateSize: useCallback(() => estimateWidth() * 1.5, [estimateWidth]),
		getScrollElement: () => parentRef.current,
		overscan: 5,
	})

	const columnCount = pages > 4 ? 4 : pages
	const columnVirtualizer = useVirtualizer({
		count: columnCount,
		estimateSize: estimateWidth,
		getScrollElement: () => parentRef.current,
		horizontal: true,
		overscan: 5,
	})

	useEffect(() => {
		rowVirtualizer.measure()
		columnVirtualizer.measure()
	}, [isAtLeastMedium, isAtLeastSmall])

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
						<div
							style={{
								height: `${rowVirtualizer.getTotalSize()}px`,
								position: 'relative',
								width: `${columnVirtualizer.getTotalSize()}px`,
							}}
						>
							{rowVirtualizer.getVirtualItems().map((virtualRow) => (
								<Fragment key={virtualRow.index}>
									{columnVirtualizer.getVirtualItems().map((virtualColumn) => {
										const virtualPage = virtualRow.index * 4 + virtualColumn.index + 1
										const imageUrl = sdk.media.bookPageURL(bookId, virtualPage)
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
													className={cx(
														'relative flex w-[7rem] flex-1 flex-col space-y-1 overflow-hidden rounded-md border-[1.5px] border-edge bg-background shadow-sm transition-colors duration-100 hover:border-edge-brand sm:w-[7.666rem] md:w-[9rem]',
														{ 'border-edge-brand': virtualPage === selectedPage },
													)}
													onClick={() => onSelectPage(virtualPage)}
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
								</Fragment>
							))}
						</div>
					</div>
				)}
			</AutoSizer>
		</div>
	)
}
