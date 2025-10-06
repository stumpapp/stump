import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback } from 'react'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
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
	const { numColumns, paddingHorizontal } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	return (
		<FlashList
			key={`recently-added-series-list-${data?.pages[0].series.nodes.length ? 'at-least-one-item' : 'empty'}`} // Force re-render when switching between empty and non-empty states
			data={data?.pages.flatMap((page) => page.series.nodes) || []}
			renderItem={({ item }) => <SeriesGridItem series={item} />}
			contentContainerStyle={{
				paddingHorizontal: paddingHorizontal,
				paddingTop: 16,
			}}
			numColumns={numColumns}
			onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
			onEndReached={onEndReached}
			contentInsetAdjustmentBehavior="always"
			ListHeaderComponent={header}
			ListHeaderComponentStyle={
				header ? { paddingBottom: 16, marginHorizontal: -paddingHorizontal } : undefined
			}
		/>
	)
}
