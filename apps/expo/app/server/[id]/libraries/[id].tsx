import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import RefreshControl from '~/components/RefreshControl'
import SeriesGridItem, { ISeriesGridItemFragment } from '~/components/series/SeriesGridItem'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

const query = graphql(`
	query LibrarySeriesScreenSeriesName($id: ID!) {
		libraryById(id: $id) {
			name
		}
	}
`)

const seriesQuery = graphql(`
	query LibrarySeriesScreen($filter: SeriesFilterInput!, $pagination: Pagination) {
		series(filter: $filter, pagination: $pagination) {
			nodes {
				id
				...SeriesGridItem
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

	if (!library) {
		throw new Error(`Series with ID ${id} not found`)
	}

	useDynamicHeader({
		title: library.name,
	})

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
		seriesQuery,
		['librarySeries', id],
		{
			filter: {
				libraryId: { eq: id },
			},
		},
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

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<FlashList
				data={data?.pages.flatMap((page) => page.series.nodes) || []}
				renderItem={renderItem}
				contentContainerStyle={{
					padding: 16,
				}}
				centerContent
				numColumns={numColumns}
				onEndReachedThreshold={0.75}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			/>
		</SafeAreaView>
	)
}
