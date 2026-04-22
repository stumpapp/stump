import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { FlashList } from '@shopify/flash-list'
import { useInfiniteGraphQL, useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { LibraryOverviewSheet, usePrefetchLibraryOverview } from '~/components/library'
import { LibrarySeriesListHeader } from '~/components/library/listHeader'
import ListEmpty from '~/components/ListEmpty'
import { useListSizing } from '~/components/listLayout'
import RefreshControl from '~/components/RefreshControl'
import SeriesListItem from '~/components/series/SeriesListItem'
import { Button, FullScreenLoader, RefreshButton, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { createSeriesFilterStore, SeriesFilterContext } from '~/stores/filters'
import { useSeriesLayout } from '~/stores/layout'

const query = graphql(`
	query LibrarySeriesScreenSeriesName($id: ID!) {
		libraryById(id: $id) {
			name
			stats {
				bookCount
				seriesCount
				completedBooks
				inProgressBooks
				totalReadingTimeSeconds
			}
		}
	}
`)

const seriesQuery = graphql(`
	query LibrarySeriesScreen(
		$filter: SeriesFilterInput!
		$orderBy: [SeriesOrderBy!]
		$pagination: Pagination
	) {
		series(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
			nodes {
				id
				...SeriesListItem
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

export default function Screen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const {
		data: { libraryById: library },
	} = useSuspenseGraphQL(query, ['libraryById', id], { id })

	const sheetRef = useRef<TrueSheet>(null)
	const prefetch = usePrefetchLibraryOverview()

	if (!library) {
		throw new Error(`Series with ID ${id} not found`)
	}

	useDynamicHeader({
		title: library.name,
	})

	const actions = useMemo(
		() => ({
			libraryId: id,
			onShowOverview: () => sheetRef.current?.present(),
		}),
		[id],
	)

	useEffect(() => {
		prefetch(id)
	}, [id, prefetch])

	// eslint-disable-next-line react-hooks/refs
	const store = useRef(createSeriesFilterStore()).current
	const { filters, sort, resetFilters } = useStore(
		store,
		useShallow((state) => ({
			filters: state.filters,
			sort: state.sort,
			resetFilters: state.resetFilters,
		})),
	)

	const {
		data,
		hasNextPage,
		fetchNextPage,
		refetch,
		isLoading: isInitialLoading,
	} = useInfiniteGraphQL(
		seriesQuery,
		['librarySeries', id, filters, sort],
		{
			filter: {
				...filters,
				libraryId: { eq: id },
			},
			orderBy: [sort],
		},
		{
			placeholderData: keepPreviousData,
		},
	)

	const nodes = data?.pages.flatMap((page) => page.series.nodes) || []

	const [isRefetching, handleRefetch] = useRefetch(refetch)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const isFiltered = Object.keys(filters).length > 0

	const layout = useSeriesLayout(`library-${id}-series`, (state) => state.layout)
	const { numColumns, paddingHorizontal, ItemSeparatorComponent } = useListSizing({ layout })

	return (
		<SeriesFilterContext.Provider value={store}>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
			>
				<FlashList
					key={layout} // force re-render when layout changes
					data={nodes}
					renderItem={({ item }) => <SeriesListItem layout={layout} series={item} />}
					contentContainerStyle={{
						paddingHorizontal: paddingHorizontal,
						paddingVertical: 16,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
					onEndReached={onEndReached}
					ListHeaderComponent={
						<LibrarySeriesListHeader
							libraryId={id}
							stats={library.stats}
							additionalActions={actions}
						/>
					}
					ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
					contentInsetAdjustmentBehavior="automatic"
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
								title={isFiltered ? 'Nothing was returned' : 'This library is empty'}
								message={
									isFiltered
										? 'Try adjusting your filters to see more results'
										: 'When your library has books you will see them here'
								}
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

				<LibraryOverviewSheet ref={sheetRef} libraryId={id} />
			</SafeAreaView>
		</SeriesFilterContext.Provider>
	)
}
