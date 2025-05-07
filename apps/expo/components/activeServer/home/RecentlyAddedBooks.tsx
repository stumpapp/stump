import { FlashList } from '@shopify/flash-list'
import { useRecentlyAddedMediaQuery } from '@stump/client'
import { Media } from '@stump/sdk'
import { memo, useCallback } from 'react'
import { View } from 'react-native'

import { BookListItem } from '~/components/book'
import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'

function RecentlyAddedBooks() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { media, hasNextPage, fetchNextPage } = useRecentlyAddedMediaQuery({
		limit: 20,
		suspense: true,
		queryKey: [serverID],
		useErrorBoundary: false,
	})

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const { width, gap } = useListItemSize()

	const renderItem = useCallback(({ item }: { item: Media }) => <BookListItem book={item} />, [])

	return (
		<View className="flex gap-4">
			<Heading size="lg">Recently Added Books</Heading>

			<FlashList
				data={media}
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
