import { FlashList, FlashListRef } from '@shopify/flash-list'
import { useInfiniteGraphQL, useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql, SeriesScreenQuery } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { useScrollToTop } from 'expo-router/react-navigation'
import { useCallback, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import { useActiveServer } from '~/components/activeServer'
import { BackgroundGradient, useBackgroundGradient } from '~/components/BackgroundGradient'
import ListEmpty from '~/components/ListEmpty'
import { useListSizing } from '~/components/listLayout'
import RefreshControl from '~/components/RefreshControl'
import { SeriesListHeader } from '~/components/series/listHeader'
import SeriesListItem from '~/components/series/SeriesListItem'
import { Button, FullScreenLoader, RefreshButton, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useSeriesFilterStore } from '~/stores/filters'
import { useSeriesLayout } from '~/stores/layout'

const query = graphql(`
	query SeriesScreen(
		$pagination: Pagination
		$filters: SeriesFilterInput
		$orderBy: [SeriesOrderBy!]
	) {
		series(pagination: $pagination, filter: $filters, orderBy: $orderBy) {
			nodes {
				id
				...SeriesListItem
				thumbnail {
					metadata {
						averageColor
					}
				}
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
type Node = SeriesScreenQuery['series']['nodes'][number]

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
		refetch: refetchStats,
	} = useSuspenseGraphQL(statsQuery, ['seriesStats', serverID])

	// i swapped to non-suspense because it was flickering the stack items
	const {
		data,
		hasNextPage,
		fetchNextPage,
		refetch: refetchSeries,
		isLoading: isInitialLoading,
	} = useInfiniteGraphQL(
		query,
		['series', serverID, filters, sort],
		{
			filters,
			orderBy: [sort],
			pagination: { offset: { page: 1 } },
		},
		{
			placeholderData: keepPreviousData,
		},
	)

	const nodes = data?.pages.flatMap((page) => page.series.nodes) || []

	const refetch = () => Promise.all([refetchSeries(), refetchStats()])

	const [isRefetching, handleRefetch] = useRefetch(refetch)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const isFiltered = Object.keys(filters).length > 0

	const listRef = useRef<FlashListRef<Node>>(null)
	useScrollToTop(listRef)

	const layout = useSeriesLayout('global', (state) => state.layout)
	const { numColumns, paddingHorizontal, ItemSeparatorComponent } = useListSizing({ layout })

	const { colors, headerColor, viewabilityConfigCallbackPairs } = useBackgroundGradient({
		data: nodes,
		layout,
		flashListRef: listRef,
	})
	useEffect(() => {
		listRef.current?.recomputeViewableItems()
	}, [filters, layout, sort])

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<BackgroundGradient colors={colors} androidHeaderColor={headerColor} layout={layout} />

			<FlashList
				key={layout} // force re-render when layout changes
				ref={listRef}
				data={nodes}
				renderItem={({ item }) => <SeriesListItem layout={layout} series={item} />}
				contentContainerStyle={{
					paddingVertical: 16,
					paddingHorizontal,
				}}
				numColumns={numColumns}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
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
				ItemSeparatorComponent={ItemSeparatorComponent}
			/>
		</SafeAreaView>
	)
}
