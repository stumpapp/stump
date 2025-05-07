import { FlashList } from '@shopify/flash-list'
import { useContinueReading } from '@stump/client'
import { Media } from '@stump/sdk'
import { Fragment, memo, useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'

import { BookListItem } from '~/components/book'
import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'
import ReadingNow from './ReadingNow'

function ContinueReading() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { media, data, fetchNextPage, hasNextPage } = useContinueReading({
		limit: 20,
		suspense: true,
		useErrorBoundary: false,
		queryKey: [serverID],
	})

	const [activeBook] = useState(() => data?.pages.at(0)?.data.at(0))

	const leftOffBooks = useMemo(
		() => media.filter(({ id }) => id !== activeBook?.id),
		[media, activeBook],
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const { width, gap } = useListItemSize()

	const renderItem = useCallback(({ item }: { item: Media }) => <BookListItem book={item} />, [])

	return (
		<Fragment>
			{activeBook && <ReadingNow book={activeBook} />}

			<View className="flex gap-4">
				<Heading size="lg">Continue Reading</Heading>

				<FlashList
					data={leftOffBooks}
					keyExtractor={({ id }) => id}
					renderItem={renderItem}
					horizontal
					estimatedItemSize={width + gap}
					onEndReached={onEndReached}
					onEndReachedThreshold={0.85}
					showsHorizontalScrollIndicator={false}
					ListEmptyComponent={<Text className="text-foreground-muted">No books in progress</Text>}
				/>
			</View>
		</Fragment>
	)
}

export default memo(ContinueReading)
