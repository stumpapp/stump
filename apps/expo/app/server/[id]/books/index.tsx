import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Suspense, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'

import { useActiveServer } from '~/components/activeServer'
import { BookGridItem } from '~/components/book'
import { IBookGridItemFragment } from '~/components/book/BookGridItem'
import { BookFilterHeader } from '~/components/book/filterHeader'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import RefreshControl from '~/components/RefreshControl'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { BookFilterContext, createBookFilterStore } from '~/stores/filters'

const query = graphql(`
	query BooksScreen(
		$pagination: Pagination
		$filters: MediaFilterInput
		$orderBy: [MediaOrderBy!]
	) {
		media(pagination: $pagination, filter: $filters, orderBy: $orderBy) {
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
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const store = useRef(createBookFilterStore()).current

	const { filters, sort } = useStore(store, (state) => ({
		filters: state.filters,
		sort: state.sort,
	}))

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
		query,
		['books', serverID, filters, sort],
		{ filters, orderBy: [sort], pagination: { offset: { page: 1 } } },
	)
	const { numColumns, paddingHorizontal } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	return (
		<BookFilterContext.Provider value={store}>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
			>
				<FlashList
					data={data?.pages.flatMap((page) => page.media.nodes) || []}
					renderItem={({ item }) => <BookGridItem book={item} />}
					contentContainerStyle={{
						paddingVertical: 16,
						paddingHorizontal: paddingHorizontal,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
					onEndReached={onEndReached}
					contentInsetAdjustmentBehavior="automatic"
					ListHeaderComponent={() => (
						<Suspense fallback={null}>
							<BookFilterHeader />
						</Suspense>
					)}
					ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
					refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				/>
			</SafeAreaView>
		</BookFilterContext.Provider>
	)
}
