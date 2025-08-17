import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { memo, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { BookListItem } from '~/components/book'
import { BookListItemFragmentType } from '~/components/book/BookListItem'
import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'

const query = graphql(`
	query RecentlyAddedBooks($pagination: Pagination) {
		recentlyAddedMedia(pagination: $pagination) {
			nodes {
				id
				...BookListItem
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

function RecentlyAddedBooks() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['recentlyAddedBooks', serverID],
		{
			pagination: { cursor: { limit: 20 } },
		},
	)
	const nodes = useMemo(
		() => data?.pages.flatMap((page) => page.recentlyAddedMedia.nodes) || [],
		[data],
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const { width, gap } = useListItemSize()

	const renderItem = useCallback(
		({ item }: { item: BookListItemFragmentType }) => <BookListItem book={item} />,
		[],
	)

	return (
		<View className="flex gap-4">
			<Heading size="lg">Recently Added Books</Heading>

			<FlashList
				data={nodes}
				keyExtractor={({ id }) => id}
				renderItem={renderItem}
				horizontal
				estimatedItemSize={width + gap}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.85}
				showsHorizontalScrollIndicator={false}
				ListEmptyComponent={<Text className="text-foreground-muted">No books recently added</Text>}
			/>
		</View>
	)
}

export default memo(RecentlyAddedBooks)
