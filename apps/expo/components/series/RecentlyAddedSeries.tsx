import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback } from 'react'

import { useActiveServer } from '../activeServer'
import { ColumnItem } from '../grid'
import { useGridItemSize } from '../grid/useGridItemSize'
import SeriesGridItem, { ISeriesGridItemFragment } from './SeriesGridItem'

const query = graphql(`
	query RecentlyAddedSeriesGrid($pagination: Pagination) {
		series(pagination: $pagination, orderBy: { series: { field: CREATED_AT, direction: DESC } }) {
			nodes {
				id
				...SeriesGridItem
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

export default function RecentlyAddedSeries() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { data, hasNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(query, [
		'recentlyAddedSeries',
		serverID,
	])
	const { numColumns, sizeEstimate } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const renderItem = useCallback(
		({ item, index }: { item: ISeriesGridItemFragment; index: number }) => (
			<ColumnItem index={index} numColumns={numColumns}>
				<SeriesGridItem series={item} />
			</ColumnItem>
		),
		[numColumns],
	)

	return (
		<FlashList
			data={data?.pages.flatMap((page) => page.series.nodes) || []}
			renderItem={renderItem}
			contentContainerStyle={{
				paddingTop: 16,
				paddingBottom: 16,
			}}
			estimatedItemSize={sizeEstimate}
			numColumns={numColumns}
			onEndReachedThreshold={0.75}
			onEndReached={onEndReached}
			contentInsetAdjustmentBehavior="automatic"
		/>
	)
}
