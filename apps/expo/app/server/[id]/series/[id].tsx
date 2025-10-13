import { useNavigationState, useScrollToTop } from '@react-navigation/native'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'

import { BookGridItem } from '~/components/book'
import { IBookGridItemFragment } from '~/components/book/BookGridItem'
import { BookFilterHeader } from '~/components/book/filterHeader'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import ListEmpty from '~/components/ListEmpty'
import RefreshControl from '~/components/RefreshControl'
import { Button, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { BookFilterContext, createBookFilterStore } from '~/stores/filters'

const query = graphql(`
	query SeriesBooksSceneSeriesName($id: ID!) {
		seriesById(id: $id) {
			resolvedName
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
				...BookGridItem
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
	const navigationState = useNavigationState((state) => state.routes)
	const { id } = useLocalSearchParams<{ id: string }>()
	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(query, ['seriesById', id], { id })

	const showBackButton = useMemo(() => {
		return navigationState?.length <= 1 && Platform.OS === 'ios'
	}, [navigationState])

	if (!series) {
		throw new Error(`Series with ID ${id} not found`)
	}

	useDynamicHeader({
		title: series.resolvedName,
		showBackButton,
	})

	const store = useRef(createBookFilterStore()).current
	const { filters, sort, resetFilters } = useStore(store, (state) => ({
		filters: state.filters,
		sort: state.sort,
		resetFilters: state.resetFilters,
	}))

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
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
	)
	const { numColumns, paddingHorizontal } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const listRef = useRef<FlashListRef<IBookGridItemFragment>>(null)
	useScrollToTop(listRef)

	const isFiltered = Object.keys(filters).length > 0

	return (
		<BookFilterContext.Provider value={store}>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
			>
				<FlashList
					ref={listRef}
					data={data?.pages.flatMap((page) => page.media.nodes) || []}
					renderItem={({ item }) => <BookGridItem book={item} />}
					contentContainerStyle={{
						paddingHorizontal: paddingHorizontal,
						paddingVertical: 16,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
					onEndReached={onEndReached}
					ListHeaderComponent={<BookFilterHeader seriesId={id} />}
					ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
					contentInsetAdjustmentBehavior="always"
					refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
					ListEmptyComponent={
						<ListEmpty
							message={isFiltered ? 'No books found matching your filters' : 'No books returned'}
							actions={
								<>
									{isFiltered && (
										<Button variant="secondary" onPress={() => resetFilters()}>
											<Text>Clear Filters</Text>
										</Button>
									)}
									<Button onPress={() => refetch()}>
										<Text>Refresh</Text>
									</Button>
								</>
							}
						/>
					}
				/>
			</SafeAreaView>
		</BookFilterContext.Provider>
	)
}
