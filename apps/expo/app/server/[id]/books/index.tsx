import { useMediaCursorQuery } from '@stump/client'
import { useCallback, useMemo } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlatGrid } from 'react-native-super-grid'

import { BookGridItem } from '~/components/book'
import RefreshControl from '~/components/RefreshControl'
import { Heading } from '~/components/ui'
import { useDisplay } from '~/lib/hooks'

export default function Screen() {
	const { width, isTablet } = useDisplay()

	const { media, isRefetching, refetch, hasNextPage, fetchNextPage } = useMediaCursorQuery({
		suspense: true,
	})

	const onFetchMore = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2,
		[isTablet, width],
	)

	return (
		<SafeAreaView className="flex-1 bg-background">
			<FlatGrid
				ListHeaderComponent={() => (
					<Heading size="xl" className="px-4 pb-4 font-semibold">
						Books
					</Heading>
				)}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				itemDimension={itemDimension}
				data={media || []}
				renderItem={({ item: book }) => <BookGridItem book={book} />}
				keyExtractor={(book) => book.id}
				onEndReached={onFetchMore}
				onEndReachedThreshold={0.75}
			/>
		</SafeAreaView>
	)
}
