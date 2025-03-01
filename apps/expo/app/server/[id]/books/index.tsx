import { useMediaCursorQuery } from '@stump/client'
import { useCallback } from 'react'

import { BookGridItem } from '~/components/book'
import { ImageGrid } from '~/components/grid'
import { Heading, icons, Text } from '~/components/ui'

const { CircleEllipsis } = icons

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
		<ImageGrid
			largeHeader={<Heading size="xl">Books</Heading>}
			header={{
				headerCenter: (
					<Text size="lg" className="tracking-wide text-foreground">
						Books
					</Text>
				),
				headerRight: <CircleEllipsis className="h-6 w-6 text-foreground" />,
				headerRightFadesIn: true,
			}}
			data={media || []}
			renderItem={({ item: book, index }) => <BookGridItem book={book} index={index} />}
			keyExtractor={(book) => book.id}
			onEndReached={onFetchMore}
			onRefresh={refetch}
			isRefetching={isRefetching}
		/>
	)
}
