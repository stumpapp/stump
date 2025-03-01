import { useLibraryByID, useLibrarySeriesCursorQuery } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'

import { ImageGrid } from '~/components/grid'
import { SeriesGridItem } from '~/components/series'
import { Heading, icons, Text } from '~/components/ui'

const { CircleEllipsis } = icons

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
		<ImageGrid
			largeHeader={<Heading size="xl">{library.name}</Heading>}
			header={{
				headerCenter: (
					<Text size="lg" className="tracking-wide text-foreground">
						{library.name}
					</Text>
				),
				headerRight: <CircleEllipsis className="h-6 w-6 text-foreground" />,
				headerRightFadesIn: true,
			}}
			data={series || []}
			renderItem={({ item: series, index }) => <SeriesGridItem series={series} index={index} />}
			keyExtractor={(series) => series.id}
			onEndReached={onEndReached}
			onRefresh={refetch}
			isRefetching={isRefetching}
		/>
	)
}
