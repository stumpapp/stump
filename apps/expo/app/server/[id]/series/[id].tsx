import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useNavigationState, useScrollToTop } from '@react-navigation/native'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { useInfiniteGraphQL, useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql, SeriesBooksScreenQuery } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { BackgroundGradient, useBackgroundGradient } from '~/components/BackgroundGradient'
import { BookListItem } from '~/components/book'
import { SeriesBooksListHeader } from '~/components/book/listHeader/SeriesBooksListHeader'
import ListEmpty from '~/components/ListEmpty'
import { useListSizing } from '~/components/listLayout'
import RefreshControl from '~/components/RefreshControl'
import { SeriesOverviewSheet, usePrefetchSeriesOverview } from '~/components/series'
import { Button, RefreshButton, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useDownloadSeries } from '~/lib/hooks/db/downloadSeries'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { BookFilterContext, createBookFilterStore } from '~/stores/filters'
import { useBooksLayout } from '~/stores/layout'

const query = graphql(`
	query SeriesBooksSceneSeriesName($id: ID!) {
		seriesById(id: $id) {
			resolvedName
			stats {
				bookCount
				completedBooks
				inProgressBooks
				totalReadingTimeSeconds
			}
			libraryId
		}
	}
`)

const booksQuery = graphql(`
	query SeriesBooksScreen(
		$filter: MediaFilterInput!
		$pagination: Pagination
		$orderBy: [MediaOrderBy!]
	) {
		media(filter: $filter, pagination: $pagination, orderBy: $orderBy) {
			nodes {
				id
				...BookListItem
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
type Node = SeriesBooksScreenQuery['media']['nodes'][number]

export default function Screen() {
	const navigationState = useNavigationState((state) => state.routes)
	const { id } = useLocalSearchParams<{ id: string }>()
	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(query, ['seriesById', id], { id })
	const { downloadSeries } = useDownloadSeries()

	const showBackButton = useMemo(() => {
		return navigationState?.length <= 1 && Platform.OS === 'ios'
	}, [navigationState])

	const sheetRef = useRef<TrueSheet>(null)
	const prefetch = usePrefetchSeriesOverview()

	if (!series) {
		throw new Error(`Series with ID ${id} not found`)
	}

	useDynamicHeader({
		title: series.resolvedName,
		showBackButton,
	})

	useEffect(() => {
		prefetch(id)
	}, [id, prefetch])

	const actions = useMemo(
		() => ({
			onShowOverview: () => sheetRef.current?.present(),
			onDownloadSeries: () => downloadSeries(id),
		}),
		[id, downloadSeries],
	)

	// eslint-disable-next-line react-hooks/refs
	const store = useRef(createBookFilterStore()).current
	const { filters, sort, resetFilters } = useStore(
		store,
		useShallow((state) => ({
			filters: state.filters,
			sort: state.sort,
			resetFilters: state.resetFilters,
		})),
	)

	const { data, hasNextPage, fetchNextPage, refetch } = useInfiniteGraphQL(
		booksQuery,
		['seriesBooks', id, filters, sort],
		{
			filter: {
				...filters,
				seriesId: { eq: id },
			},
			orderBy: [sort],
			pagination: { offset: { page: 1 } },
		},
		{
			placeholderData: keepPreviousData,
		},
	)

	const nodes = data?.pages.flatMap((page) => page.media.nodes) || []

	const [isRefetching, handleRefetch] = useRefetch(refetch)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const listRef = useRef<FlashListRef<Node>>(null)
	useScrollToTop(listRef)

	const isFiltered = Object.keys(filters).length > 0

	const layoutKey = `library-${series.libraryId}-seriesBooks`
	const layout = useBooksLayout(layoutKey, (state) => state.layout)
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
		<BookFilterContext.Provider value={store}>
			<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
				<BackgroundGradient colors={colors} androidHeaderColor={headerColor} layout={layout} />

				<FlashList
					key={layout} // force re-render when layout changes
					ref={listRef}
					data={nodes}
					renderItem={({ item }) => <BookListItem layout={layout} book={item} />}
					contentContainerStyle={{
						paddingHorizontal,
						paddingVertical: 16,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
					onEndReached={onEndReached}
					viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
					ListHeaderComponent={
						<SeriesBooksListHeader
							seriesId={id}
							layoutKey={layoutKey}
							stats={series.stats}
							additionalActions={actions}
						/>
					}
					ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
					contentInsetAdjustmentBehavior="always"
					refreshControl={
						nodes.length > 0 ? (
							<RefreshControl refreshing={isRefetching} onRefresh={handleRefetch} />
						) : undefined
					}
					ListEmptyComponent={
						<ListEmpty
							message={isFiltered ? 'No books found matching your filters' : 'No books returned'}
							actions={
								<>
									{isFiltered && (
										<Button
											size="lg"
											roundness="full"
											variant="secondary"
											onPress={() => resetFilters()}
										>
											<Text>Clear Filters</Text>
										</Button>
									)}
									<RefreshButton
										size="lg"
										roundness="full"
										onPress={() => handleRefetch()}
										isRefreshing={isRefetching}
									>
										<Text>Refresh</Text>
									</RefreshButton>
								</>
							}
						/>
					}
					ItemSeparatorComponent={ItemSeparatorComponent}
				/>
			</SafeAreaView>

			<SeriesOverviewSheet ref={sheetRef} seriesId={id} />
		</BookFilterContext.Provider>
	)
}
