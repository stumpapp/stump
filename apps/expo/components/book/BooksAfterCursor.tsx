import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { View } from 'react-native'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'
import BookListItem from './BookListItem'

const query = graphql(`
	query BooksAfterCursor($id: ID!, $pagination: Pagination) {
		mediaById(id: $id) {
			nextInSeries(pagination: $pagination) {
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
	}
`)

type Props = {
	cursor: string
}

export function BooksAfterCursor({ cursor }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { data, hasNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['booksAfterCursor', cursor, serverID],
		{
			id: cursor,
			pagination: {
				cursor: { limit: 20 },
			},
		},
	)

	const onEndReached = () => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}

	const { horizontalGap } = useListItemSize()

	const nodes = data.pages.flatMap((page) => page.mediaById?.nextInSeries.nodes || [])

	if (nodes.length === 0) return null

	return (
		<View className="gap-3">
			<Text className="ios:px-4 px-2 text-lg font-semibold text-foreground-muted">Up Next</Text>
			<FlashList
				data={nodes}
				renderItem={({ item }) => <BookListItem book={item} />}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 16 }}
				ItemSeparatorComponent={() => <View style={{ width: horizontalGap }} />}
				onEndReached={onEndReached}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
			/>
		</View>
	)
}
