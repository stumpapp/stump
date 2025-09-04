import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'

import { useActiveServer } from '~/components/activeServer'
import { BookGridItem } from '~/components/book'
import { IBookGridItemFragment } from '~/components/book/BookGridItem'
import { BookFilterHeader } from '~/components/book/filterHeader'
import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import RefreshControl from '~/components/RefreshControl'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
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

	const navigation = useNavigation()
	// useDynamicHeader({
	// 	title: 'Books',
	// 	headerLeft: () => <ChevronLeft onPress={() => navigation.goBack()} />,
	// })

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
	const { numColumns, sizeEstimate } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const renderItem = useCallback(
		({ item, index }: { item: IBookGridItemFragment; index: number }) => (
			<ColumnItem index={index} numColumns={numColumns}>
				<BookGridItem book={item} />
			</ColumnItem>
		),
		[numColumns],
	)

	return (
		<BookFilterContext.Provider value={store}>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
			>
				<FlashList
					data={data?.pages.flatMap((page) => page.media.nodes) || []}
					renderItem={renderItem}
					contentContainerStyle={{
						padding: 16,
					}}
					estimatedItemSize={sizeEstimate}
					numColumns={numColumns}
					onEndReachedThreshold={0.75}
					onEndReached={onEndReached}
					contentInsetAdjustmentBehavior="automatic"
					ListHeaderComponent={<BookFilterHeader />}
					ListHeaderComponentStyle={{ paddingBottom: 16 }}
					refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				/>
			</SafeAreaView>
		</BookFilterContext.Provider>
	)
}
