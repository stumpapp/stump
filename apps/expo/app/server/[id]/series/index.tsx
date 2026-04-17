import { useScrollToTop } from '@react-navigation/native'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { useInfiniteGraphQL, useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import { useActiveServer } from '~/components/activeServer'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import ListEmpty from '~/components/ListEmpty'
import RefreshControl from '~/components/RefreshControl'
import { SeriesGridItem } from '~/components/series'
import { SeriesListHeader } from '~/components/series/listHeader'
import { ISeriesGridItemFragment } from '~/components/series/SeriesGridItem'
import { Button, FullScreenLoader, RefreshButton, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useSeriesFilterStore } from '~/stores/filters'

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

const statsQuery = graphql(`
	query SeriesScreenStats {
		librariesStats {
			seriesCount
			bookCount
			totalBytes
			completedBooks
			inProgressBooks
			totalReadingTimeSeconds
		}
	}
`)

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { filters, sort, resetFilters } = useSeriesFilterStore(
		useShallow((state) => ({
			filters: state.filters,
			sort: state.sort,
			resetFilters: state.resetFilters,
		})),
	)

	const {
		data: { librariesStats },
	} = useSuspenseGraphQL(statsQuery, ['seriesStats', serverID])

	// i swapped to non-suspense because it was flickering the stack items
	const {
		data,
		hasNextPage,
		fetchNextPage,
		refetch,
		isLoading: isInitialLoading,
	} = useInfiniteGraphQL(query, ['series', serverID, filters, sort], {
		filters,
		orderBy: [sort],
		pagination: { offset: { page: 1 } },
	})
	const { numColumns, paddingHorizontal } = useGridItemSize()

	const nodes = data?.pages.flatMap((page) => page.series.nodes) || []

	const [isRefetching, handleRefetch] = useRefetch(refetch)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const isFiltered = Object.keys(filters).length > 0

	const listRef = useRef<FlashListRef<ISeriesGridItemFragment>>(null)
	useScrollToTop(listRef)

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<FlashList
				ref={listRef}
				data={nodes}
				renderItem={({ item }) => <SeriesGridItem series={item} />}
				contentContainerStyle={{
					paddingVertical: 16,
					paddingHorizontal: paddingHorizontal,
				}}
				numColumns={numColumns}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="always"
				ListHeaderComponent={<SeriesListHeader stats={librariesStats} />}
				ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
				refreshControl={
					nodes.length > 0 ? (
						<RefreshControl refreshing={isRefetching} onRefresh={handleRefetch} />
					) : undefined
				}
				ListEmptyComponent={
					isInitialLoading ? (
						<FullScreenLoader />
					) : (
						<ListEmpty
							message={isFiltered ? 'No series found matching your filters' : 'No series returned'}
							actions={
								<>
									{isFiltered && (
										<Button
											roundness="full"
											variant="secondary"
											size="lg"
											onPress={() => resetFilters()}
										>
											<Text>Clear Filters</Text>
										</Button>
									)}

									<RefreshButton
										className="flex-row items-center"
										roundness="full"
										size="lg"
										onPress={() => handleRefetch()}
										isRefreshing={isRefetching}
									>
										<Text>Refresh</Text>
									</RefreshButton>
								</>
							}
						/>
					)
				}
			/>
		</SafeAreaView>
	)
}
