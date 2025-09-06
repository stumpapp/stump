import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { memo, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { RecentlyAddedSeriesItem } from '~/components/series'
import { IRecentlyAddedSeriesItemFragment } from '~/components/series/RecentlyAddedSeriesItem'
import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'

const query = graphql(`
	query RecentlyAddedSeriesHorizontal($pagination: Pagination) {
		recentlyAddedSeries(pagination: $pagination) {
			nodes {
				id
				...RecentlyAddedSeriesItem
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

function RecentlyAddedSeriesHorizontal() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['recentlyAddedSeries', serverID, 'horizontal'],
		{
			pagination: { cursor: { limit: 20 } },
		},
	)
	const nodes = useMemo(
		() => data?.pages.flatMap((page) => page.recentlyAddedSeries.nodes) || [],
		[data],
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const { gap } = useListItemSize()

	const renderItem = useCallback(
		({ item }: { item: IRecentlyAddedSeriesItemFragment }) => (
			<RecentlyAddedSeriesItem series={item} />
		),
		[],
	)

	return (
		<View className="flex gap-4">
			<Heading size="xl">Recently Added Series</Heading>

			<FlashList
				data={nodes}
				keyExtractor={({ id }) => id}
				renderItem={renderItem}
				horizontal
				ItemSeparatorComponent={() => <View style={{ width: gap * 2 }} />}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.85}
				showsHorizontalScrollIndicator={false}
				ListEmptyComponent={<Text className="text-foreground-muted">No series recently added</Text>}
			/>
		</View>
	)
}

export default memo(RecentlyAddedSeriesHorizontal)
