import { useSeriesCursorQuery } from '@stump/client'
import { useCallback } from 'react'

import { ImageGrid } from '~/components/grid'
import { SeriesGridItem } from '~/components/series'
import { Heading, icons, Text } from '~/components/ui'

const { CircleEllipsis } = icons

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
		<ImageGrid
			largeHeader={<Heading size="xl">Series</Heading>}
			header={{
				headerCenter: (
					<Text size="lg" className="tracking-wide text-foreground">
						Series
					</Text>
				),
				headerRight: <CircleEllipsis className="h-6 w-6 text-foreground" />,
				headerRightFadesIn: true,
			}}
			data={series || []}
			renderItem={({ item: series, index }) => <SeriesGridItem series={series} index={index} />}
			keyExtractor={(series) => series.id}
			onEndReached={onFetchMore}
			onRefresh={refetch}
			isRefetching={isRefetching}
		/>
	)
}
