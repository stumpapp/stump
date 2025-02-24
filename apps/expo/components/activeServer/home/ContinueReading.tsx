import { useContinueReading } from '@stump/client'
import { Fragment, useMemo } from 'react'
import { FlatList, View } from 'react-native'

import { BookListItem } from '~/components/book'
import { Heading, Text } from '~/components/ui'

import ReadingNow from './ReadingNow'

export default function ContinueReading() {
	const { media } = useContinueReading({
		limit: 20,
		suspense: true,
	})

	const activeBook = useMemo(() => media.at(0), [media])
	const leftOffBooks = useMemo(() => media.slice(1), [media])

	return (
		<Fragment>
			{activeBook && <ReadingNow book={activeBook} />}

			<View className="flex gap-4">
				<Heading size="lg">Continue Reading</Heading>

				<FlatList
					data={leftOffBooks}
					keyExtractor={({ id }) => id}
					renderItem={({ item: book }) => <BookListItem book={book} />}
					horizontal
					pagingEnabled
					initialNumToRender={10}
					maxToRenderPerBatch={10}
					showsHorizontalScrollIndicator={false}
					ListEmptyComponent={<Text className="text-foreground-muted">No books in progress</Text>}
				/>
			</View>
		</Fragment>
	)
}
