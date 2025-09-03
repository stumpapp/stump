import { useScrollToTop } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import RefreshControl from '~/components/RefreshControl'
import { SeriesGridItem } from '~/components/series'
import { SeriesFilterHeader } from '~/components/series/filterHeader'
import { ISeriesGridItemFragment } from '~/components/series/SeriesGridItem'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
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

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const navigation = useNavigation()
	useDynamicHeader({
		title: 'Series',
		// FIXME: Why is this required?
		headerLeft:
			Platform.OS === 'ios' ? () => <ChevronLeft onPress={() => navigation.goBack()} /> : undefined,
	})

	const { filters, sort } = useSeriesFilterStore((store) => ({
		filters: store.filters,
		sort: store.sort,
	}))

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
		query,
		['series', serverID, filters, sort],
		{ filters, orderBy: [sort], pagination: { offset: { page: 1 } } },
	)
	const { numColumns, sizeEstimate } = useGridItemSize()

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

	const listRef = useRef<FlashList<ISeriesGridItemFragment>>(null)
	useScrollToTop(listRef)

	return (
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
				estimatedItemSize={sizeEstimate}
				numColumns={numColumns}
				onEndReachedThreshold={0.75}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="always"
				ListHeaderComponent={<SeriesFilterHeader />}
				ListHeaderComponentStyle={{ paddingBottom: 16 }}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			/>
		</SafeAreaView>
	)
}
