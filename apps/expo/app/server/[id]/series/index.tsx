import { useScrollToTop } from '@react-navigation/native'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useNavigation } from 'expo-router'
import { useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'

import { useActiveServer } from '~/components/activeServer'
import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import ListEmpty from '~/components/ListEmpty'
import RefreshControl from '~/components/RefreshControl'
import { SeriesGridItem } from '~/components/series'
import { SeriesFilterHeader } from '~/components/series/filterHeader'
import { ISeriesGridItemFragment } from '~/components/series/SeriesGridItem'
import { icons } from '~/lib'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { createSeriesFilterStore, SeriesFilterContext } from '~/stores/filters'

const { ChevronLeft } = icons

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

	const navigation = useNavigation()
	useDynamicHeader({
		title: 'Series',
		// FIXME: Why is this required?
		headerLeft:
			Platform.OS === 'ios'
				? () => <ChevronLeft className="text-foreground" onPress={() => navigation.goBack()} />
				: undefined,
	})

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
	const { numColumns } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const renderItem = useCallback(
		({ item, index }: { item: ISeriesGridItemFragment; index: number }) => (
			<ColumnItem index={index} numColumns={numColumns}>
				<SeriesGridItem series={item} />
			</ColumnItem>
		),
		[numColumns],
	)

	const isFiltered = Object.keys(filters).length > 0

	const listRef = useRef<FlashListRef<ISeriesGridItemFragment>>(null)
	useScrollToTop(listRef)

	return (
		<SeriesFilterContext.Provider value={store}>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
			>
				<FlashList
					ref={listRef}
					data={data?.pages.flatMap((page) => page.series.nodes) || []}
					renderItem={renderItem}
					contentContainerStyle={{
						padding: 16,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={0.75}
					onEndReached={onEndReached}
					contentInsetAdjustmentBehavior="always"
					ListHeaderComponent={<SeriesFilterHeader />}
					ListHeaderComponentStyle={{ paddingBottom: 16 }}
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
