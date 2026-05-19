import { FlashList } from '@shopify/flash-list'
import { useInfiniteGraphQL, useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useActiveServer } from '~/components/activeServer'
import { BookListItem } from '~/components/book'
import { BooksListHeader } from '~/components/book/listHeader'
import ListEmpty from '~/components/ListEmpty'
import { useListSizing } from '~/components/listLayout'
import RefreshControl from '~/components/RefreshControl'
import { Button, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { BookFilterContext, createBookFilterStore, useInitialBookFilters } from '~/stores/filters'
import { useBooksLayout } from '~/stores/layout'

const query = graphql(`
	query BooksScreen(
		$pagination: Pagination
		$filters: MediaFilterInput
		$orderBy: [MediaOrderBy!]
	) {
		media(pagination: $pagination, filter: $filters, orderBy: $orderBy) {
			nodes {
				id
				...BookListItem
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
	query BooksScreenStats {
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
	const initialFilters = useInitialBookFilters()

	// eslint-disable-next-line react-hooks/refs
	const store = useRef(createBookFilterStore(initialFilters)).current

	const { filters, sort, resetFilters } = useStore(
		store,
		useShallow((state) => ({
			filters: state.filters,
			sort: state.sort,
			resetFilters: state.resetFilters,
		})),
	)

	const {
		data: { librariesStats: booksStats },
		refetch: refetchStats,
	} = useSuspenseGraphQL(statsQuery, ['booksStats', serverID])

	const {
		data,
		hasNextPage,
		fetchNextPage,
		refetch: refetchBooks,
	} = useInfiniteGraphQL(
		query,
		['books', serverID, filters, sort],
		{
			filters,
			orderBy: [sort],
			pagination: { offset: { page: 1 } },
		},
		{
			placeholderData: keepPreviousData,
		},
	)

	const refetch = () => Promise.all([refetchBooks(), refetchStats()])

	const [isRefetching, onRefetch] = useRefetch(refetch)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const isFiltered = Object.keys(filters).length > 0

	const layout = useBooksLayout('global', (state) => state.layout)
	const { numColumns, paddingHorizontal, ItemSeparatorComponent } = useListSizing({ layout })

	return (
		<BookFilterContext.Provider value={store}>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
			>
				<FlashList
					key={layout} // force re-render when layout changes
					data={data?.pages.flatMap((page) => page.media.nodes) || []}
					renderItem={({ item }) => <BookListItem layout={layout} book={item} />}
					contentContainerStyle={{
						paddingVertical: 16,
						paddingHorizontal,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
					onEndReached={onEndReached}
					contentInsetAdjustmentBehavior="automatic"
					ListHeaderComponent={<BooksListHeader stats={booksStats} />}
					ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
					refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefetch} />}
					ListEmptyComponent={
						<ListEmpty
							message={isFiltered ? 'No books found matching your filters' : 'No books returned'}
							actions={
								<>
									{isFiltered && (
										<Button roundness="full" variant="secondary" onPress={() => resetFilters()}>
											<Text>Clear Filters</Text>
										</Button>
									)}
									<Button roundness="full" onPress={() => refetch()}>
										<Text>Refresh</Text>
									</Button>
								</>
							}
						/>
					}
					ItemSeparatorComponent={ItemSeparatorComponent}
				/>
			</SafeAreaView>
		</BookFilterContext.Provider>
	)
}
