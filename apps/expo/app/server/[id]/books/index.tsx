import { useMediaCursorQuery } from '@stump/client'
import { Media } from '@stump/sdk'
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

	const renderItem = useCallback(
		({ item: book, index }: { item: Media; index: number }) => (
			<BookGridItem book={book} index={index} />
		),
		[],
	)

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ImageGrid
				header="Books"
				data={media || []}
				renderItem={renderItem}
				keyExtractor={(book) => book.id}
				onEndReached={onFetchMore}
				onRefresh={refetch}
				isRefetching={isRefetching}
			/>
		</SafeAreaView>
	)
}
