import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BookGridItem } from '~/components/book'
import { IBookGridItemFragment } from '~/components/book/BookGridItem'
import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

const query = graphql(`
	query SeriesBooksSceneSeriesName($id: ID!) {
		seriesById(id: $id) {
			resolvedName
		}
	}
`)

const booksQuery = graphql(`
	query SeriesBooksScreen($filter: MediaFilterInput!, $pagination: Pagination) {
		media(filter: $filter, pagination: $pagination) {
			nodes {
				id
				...BookGridItem
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
		data: { seriesById: series },
	} = useSuspenseGraphQL(query, ['seriesById', id], { id })

	if (!series) {
		throw new Error(`Series with ID ${id} not found`)
	}

	const navigation = useNavigation()
	useDynamicHeader({
		title: series.resolvedName,
		headerLeft: () => <ChevronLeft onPress={() => navigation.goBack()} />,
	})

	const { data, hasNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		booksQuery,
		['seriesBooks', id],
		{
			filter: {
				seriesId: { eq: id },
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
		({ item, index }: { item: IBookGridItemFragment; index: number }) => (
			<ColumnItem index={index} numColumns={numColumns}>
				<BookGridItem book={item} />
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
				data={data?.pages.flatMap((page) => page.media.nodes) || []}
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
