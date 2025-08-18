import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
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

	const navigation = useNavigation()
	useDynamicHeader({
		title: library.name,
		headerLeft: () => <ChevronLeft onPress={() => navigation.goBack()} />,
	})

	const { data, hasNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		seriesQuery,
		['librarySeries', id],
		{
			filter: {
				libraryId: { eq: id },
			},
		},
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
				estimatedItemSize={sizeEstimate}
				numColumns={numColumns}
				onEndReachedThreshold={0.75}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="automatic"
			/>
		</SafeAreaView>
	)
}
