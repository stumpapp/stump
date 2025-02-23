import { useRecentlyAddedMediaQuery } from '@stump/client'
import { useCallback } from 'react'
import { FlatList, View } from 'react-native'

import { BookListItem } from '~/components/book'
import { Heading, Text } from '~/components/ui'

export default function RecentlyAddedBooks() {
	const { media, hasNextPage, fetchNextPage } = useRecentlyAddedMediaQuery({
		limit: 20,
		suspense: true,
	})

	const handleEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	return (
		<View className="flex gap-4">
			<Heading size="lg">Recently Added Books</Heading>

			<FlatList
				data={media}
				keyExtractor={({ id }) => id}
				renderItem={({ item: book }) => <BookListItem book={book} />}
				horizontal
				pagingEnabled
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				showsHorizontalScrollIndicator={false}
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.75}
				ListEmptyComponent={<Text className="text-foreground-muted">No books recently added</Text>}
			/>
		</View>
	)
}
