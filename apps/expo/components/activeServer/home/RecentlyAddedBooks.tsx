import { FlashList } from '@shopify/flash-list'
import { useRecentlyAddedMediaQuery } from '@stump/client'
import { useCallback } from 'react'
import { View } from 'react-native'

import { BookListItem } from '~/components/book'
import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'

export default function RecentlyAddedBooks() {
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

	return (
		<View className="flex gap-4">
			<Heading size="lg">Recently Added Books</Heading>

			<FlashList
				data={media}
				keyExtractor={({ id }) => id}
				renderItem={({ item: book }) => <BookListItem book={book} />}
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
