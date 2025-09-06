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
				... on OffsetPaginationInfo {
					totalPages
					currentPage
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

type Props = {
	header?: React.ReactElement
}

export default function RecentlyAddedSeries({ header }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { data, hasNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['recentlyAddedSeries', serverID],
		{ pagination: { offset: { page: 1, pageSize: 20 } } },
	)
	const { numColumns } = useGridItemSize()

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
				padding: 16,
			}}
			numColumns={numColumns}
			onEndReachedThreshold={0.75}
			onEndReached={onEndReached}
			contentInsetAdjustmentBehavior="always"
			ListHeaderComponent={header}
			ListHeaderComponentStyle={header ? { paddingBottom: 16, marginHorizontal: -16 } : undefined}
		/>
	)
}
