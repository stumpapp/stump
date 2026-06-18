import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { memo, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { HorizontalBookListItem } from '~/components/book'
import { HorizontalBookListItemFragmentType } from '~/components/book/HorizontalBookListItem'
import { Heading, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useListItemSize, useTranslate } from '~/lib/hooks'

import { useActiveServer } from '../context'

const query = graphql(`
	query RecentlyAddedBooks($pagination: Pagination) {
		recentlyAddedMedia(pagination: $pagination) {
			nodes {
				id
				...HorizontalBookListItem
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
	const { t } = useTranslate()
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

	const renderItem = useCallback(
		({ item }: { item: HorizontalBookListItemFragmentType }) => (
			<HorizontalBookListItem book={item} />
		),
		[],
	)

	const { horizontalGap } = useListItemSize()

	return (
		<View className="flex">
			<Heading size="xl" className="px-4">
				{t('stumpServer.recentlyAddedBooks.label')}
			</Heading>

			<FlashList
				data={nodes}
				keyExtractor={({ id }) => id}
				renderItem={renderItem}
				horizontal
				contentContainerStyle={{ padding: 16 }}
				onEndReached={onEndReached}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				showsHorizontalScrollIndicator={false}
				ItemSeparatorComponent={() => <View style={{ width: horizontalGap }} />}
				ListEmptyComponent={
					<Text className="text-foreground-muted">
						{t('stumpServer.recentlyAddedBooks.emptyText)')}
					</Text>
				}
			/>
		</View>
	)
}

export default memo(RecentlyAddedBooks)
