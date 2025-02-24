import { useSeriesCursorQuery } from '@stump/client'
import { useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ImageGrid } from '~/components/grid'
import { SeriesGridItem } from '~/components/series'

export default function Screen() {
	const { series, isRefetching, refetch, hasNextPage, fetchNextPage } = useSeriesCursorQuery({
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
				header="Series"
				data={series || []}
				renderItem={({ item: series }) => <SeriesGridItem series={series} />}
				keyExtractor={(series) => series.id}
				onEndReached={onFetchMore}
				onRefresh={refetch}
				isRefetching={isRefetching}
			/>
		</SafeAreaView>
	)
}
