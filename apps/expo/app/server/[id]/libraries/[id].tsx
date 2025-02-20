import { useLibraryByID, useLibrarySeriesCursorQuery } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ImageGrid } from '~/components/grid'
import { SeriesGridItem } from '~/components/series'

export default function Screen() {
	const { id } = useLocalSearchParams<{ id: string }>()

	const { library } = useLibraryByID(id, { suspense: true })
	const { series, hasNextPage, fetchNextPage, refetch, isRefetching } = useLibrarySeriesCursorQuery(
		{
			id,
			suspense: true,
		},
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	if (!library) return null

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ImageGrid
				header={library.name}
				data={series || []}
				renderItem={({ item: series }) => <SeriesGridItem series={series} />}
				keyExtractor={(series) => series.id}
				onRefresh={refetch}
				isRefetching={isRefetching}
				onEndReached={onEndReached}
			/>
		</SafeAreaView>
	)
}
