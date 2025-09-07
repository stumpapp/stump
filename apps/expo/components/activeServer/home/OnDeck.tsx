import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { memo, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { OnDeckBookItem } from '~/components/book'
import { OnDeckBookItemFragmentType } from '~/components/book/OnDeckBookItem'
import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'

const query = graphql(`
	query OnDeckBooks($pagination: Pagination) {
		onDeck(pagination: $pagination) {
			nodes {
				id
				...OnDeckBookItem
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

function OnDeck() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['onDeck', serverID],
		{
			pagination: { offset: { page: 1, pageSize: 20 } },
		},
	)
	const nodes = useMemo(() => data?.pages.flatMap((page) => page.onDeck.nodes) || [], [data])

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const renderItem = useCallback(
		({ item }: { item: OnDeckBookItemFragmentType }) => <OnDeckBookItem book={item} />,
		[],
	)

	const { gap } = useListItemSize()

	return (
		<View className="flex gap-4">
			<Heading size="xl">Your Next Read</Heading>

			<FlashList
				data={nodes}
				keyExtractor={({ id }) => id}
				renderItem={renderItem}
				horizontal
				onEndReached={onEndReached}
				onEndReachedThreshold={0.85}
				showsHorizontalScrollIndicator={false}
				ItemSeparatorComponent={() => <View style={{ width: gap * 2 }} />}
				ListEmptyComponent={<Text className="text-foreground-muted">No books on deck</Text>}
			/>
		</View>
	)
}

export default memo(OnDeck)
