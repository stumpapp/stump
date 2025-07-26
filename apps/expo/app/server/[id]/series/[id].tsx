import { useSeriesBookCursorQuery, useSeriesByID } from '@stump/client'
import { Media } from '@stump/sdk'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BookGridItem } from '~/components/book'
import { ImageGrid } from '~/components/grid'

export default function Screen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const { series } = useSeriesByID(id, { suspense: true })
	const { media, hasNextPage, fetchNextPage, refetch, isRefetching } = useSeriesBookCursorQuery({
		id,
		suspense: true,
	})

	const onEndReached = useCallback(() => {
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

	if (!series) return null

	const seriesName = series.metadata?.title || series.name

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ImageGrid
				header={seriesName}
				data={media || []}
				renderItem={renderItem}
				keyExtractor={(book) => book.id}
				onEndReached={onEndReached}
				onRefresh={refetch}
				isRefetching={isRefetching}
			/>
		</SafeAreaView>
	)
}
