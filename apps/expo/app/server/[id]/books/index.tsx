import { useMediaCursorQuery } from '@stump/client'
import { useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BookGridItem } from '~/components/book'
import { ImageGrid } from '~/components/grid'

export default function Screen() {
	const { media, isRefetching, refetch, hasNextPage, fetchNextPage } = useMediaCursorQuery({
		suspense: true,
	})

	const onFetchMore = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ImageGrid
				header="Books"
				data={media || []}
				renderItem={({ item: book }) => <BookGridItem book={book} />}
				keyExtractor={(book) => book.id}
				onEndReached={onFetchMore}
				onRefresh={refetch}
				isRefetching={isRefetching}
			/>
		</SafeAreaView>
	)
}
