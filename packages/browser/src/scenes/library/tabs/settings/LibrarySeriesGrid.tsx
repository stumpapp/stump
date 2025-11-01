import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql, LibrarySeriesGridQuery } from '@stump/graphql'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Fragment, useCallback, useEffect, useRef } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks/usePreferences'

const query = graphql(`
	query LibrarySeriesGrid($id: String!, $pagination: Pagination) {
		series(filter: { libraryId: { eq: $id } }, pagination: $pagination) {
			nodes {
				id
				thumbnail {
					url
				}
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
					limit
				}
			}
		}
	}
`)

export type SelectedSeries = LibrarySeriesGridQuery['series']['nodes'][number]

type Props = {
	libraryId: string
	onSelectSeries: (series: SelectedSeries) => void
}

// TODO: Create generalized VirtualizedGrid component and trim the reused logic
export default function LibrarySeriesGrid({ libraryId, onSelectSeries }: Props) {
	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['librarySeriesGrid', libraryId],
		{
			id: libraryId,
			pagination: { cursor: { limit: 50 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.series.nodes)

	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

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

	const rowCount = nodes.length > 4 ? nodes.length / 4 : 1
	const rowVirtualizer = useVirtualizer({
		count: rowCount,
		// for thumbnailRatio e.g. 2:3 (thumbnailRatio = 2/3), we take the result of estimateWidth and multiply by 3/2
		estimateSize: useCallback(
			() => estimateWidth() / thumbnailRatio,
			[estimateWidth, thumbnailRatio],
		),
		getScrollElement: () => parentRef.current,
		overscan: 5,
	})

	const columnCount = nodes.length > 4 ? 4 : nodes.length
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
								<Fragment key={virtualRow.index}>
									{columnVirtualizer.getVirtualItems().map((virtualColumn) => {
										const virtualPage = virtualRow.index * 4 + virtualColumn.index + 1
										const thisSeries = nodes[virtualPage - 1]
										const imageUrl = thisSeries?.thumbnail?.url
										if (!thisSeries || !imageUrl) {
											return null
										}
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
													className="relative flex w-[7rem] flex-1 flex-col space-y-1 overflow-hidden rounded-md border-[1.5px] border-edge-subtle bg-background shadow-sm transition-colors duration-100 hover:border-edge-brand sm:w-[7.666rem] md:w-[9rem]"
													onClick={() => onSelectSeries(thisSeries)}
												>
													<div
														className="relative bg-cover bg-center p-0"
														style={{
															backgroundImage: `url('${imageUrl}')`,
															aspectRatio: thumbnailRatio,
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
