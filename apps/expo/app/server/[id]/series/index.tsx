import { useScrollToTop } from '@react-navigation/native'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'

import { useActiveServer } from '~/components/activeServer'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import ListEmpty from '~/components/ListEmpty'
import RefreshControl from '~/components/RefreshControl'
import { SeriesGridItem } from '~/components/series'
import { SeriesFilterHeader } from '~/components/series/filterHeader'
import { ISeriesGridItemFragment } from '~/components/series/SeriesGridItem'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { createSeriesFilterStore, SeriesFilterContext } from '~/stores/filters'

const query = graphql(`
	query SeriesScreen(
		$pagination: Pagination
		$filters: SeriesFilterInput
		$orderBy: [SeriesOrderBy!]
	) {
		series(pagination: $pagination, filter: $filters, orderBy: $orderBy) {
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

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const store = useRef(createSeriesFilterStore()).current

	const { filters, sort } = useStore(store, (state) => ({
		filters: state.filters,
		sort: state.sort,
	}))

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
		query,
		['series', serverID, filters, sort],
		{ filters, orderBy: [sort], pagination: { offset: { page: 1 } } },
	)
	const { numColumns, paddingHorizontal } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const isFiltered = Object.keys(filters).length > 0

	const listRef = useRef<FlashListRef<ISeriesGridItemFragment>>(null)
	useScrollToTop(listRef)

	return (
		<SeriesFilterContext.Provider value={store}>
			<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
				<FlashList
					ref={listRef}
					data={data?.pages.flatMap((page) => page.series.nodes) || []}
					renderItem={({ item }) => <SeriesGridItem series={item} />}
					contentContainerStyle={{
						paddingVertical: 16,
						paddingHorizontal: paddingHorizontal,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
					onEndReached={onEndReached}
					contentInsetAdjustmentBehavior="always"
					ListHeaderComponent={<SeriesFilterHeader />}
					ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
					refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
					ListEmptyComponent={
						<ListEmpty
							message={
								isFiltered
									? 'No series found matching your filters'
									: 'No series returned. Have you created a library?'
							}
						/>
					}
				/>
			</SafeAreaView>
		</SeriesFilterContext.Provider>
	)
}
