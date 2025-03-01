import { useSeriesBookCursorQuery, useSeriesByID } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'

import { BookGridItem } from '~/components/book'
import { ImageGrid } from '~/components/grid'
import { Heading, Text } from '~/components/ui'
import { icons } from '~/lib'

const { CircleEllipsis } = icons

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

	if (!series) return null

	const seriesName = series.metadata?.title || series.name

	return (
		<ImageGrid
			largeHeader={<Heading size="xl">{seriesName}</Heading>}
			header={{
				headerCenter: (
					<Text size="lg" className="tracking-wide text-foreground">
						{seriesName}
					</Text>
				),
				headerRight: <CircleEllipsis className="h-6 w-6 text-foreground" />,
				headerRightFadesIn: true,
			}}
			data={media || []}
			renderItem={({ item: book, index }) => <BookGridItem book={book} index={index} />}
			onEndReached={onEndReached}
			onRefresh={refetch}
			isRefetching={isRefetching}
		/>
	)
}
