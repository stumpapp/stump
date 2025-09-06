import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { memo, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'
import { RecentlyAddedSeriesItem } from '~/components/series'
import { IRecentlyAddedSeriesItemFragment } from '~/components/series/RecentlyAddedSeriesItem'

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
		['recentlyAddedSeries', serverID],
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

	const gapSize = gap * 2

	const renderItem = useCallback(
		({ item, index }: { item: IRecentlyAddedSeriesItemFragment; index: number }) => {
			const marginLeft = index === 0 ? 0 : gapSize / 2
			const marginRight = index === nodes.length - 1 ? gapSize : gapSize / 2
			return (
				<View
					style={{
						flexGrow: 1,
						marginLeft,
						marginRight,
					}}
				>
					<RecentlyAddedSeriesItem series={item} />
				</View>
			)
		},
		[gapSize],
	)

	return (
		<View className="flex gap-4">
			<Heading size="xl">Recently Added Series</Heading>

			<FlashList
				data={nodes}
				keyExtractor={({ id }) => id}
				renderItem={renderItem}
				horizontal
				// estimateItemSize={width + gap}
				estimatedItemSize={240 * (2 / 3) + gap}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.85}
				showsHorizontalScrollIndicator={false}
				ListEmptyComponent={<Text className="text-foreground-muted">No series recently added</Text>}
			/>
		</View>
	)
}

export default memo(RecentlyAddedSeriesHorizontal)
