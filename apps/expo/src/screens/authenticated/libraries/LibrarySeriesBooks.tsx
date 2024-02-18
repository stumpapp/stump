import { type RouteProp, useRoute } from '@react-navigation/native'
import { useMediaCursorQuery } from '@stump/client'
import React, { useCallback } from 'react'
import { FlatList } from 'react-native'

import { ScreenRootView, View } from '@/components'

import SeriesBookLink from './SeriesBookLink'

type Params = {
	params: {
		id: string
	}
}

export default function LibrarySeriesBookList() {
	const {
		params: { id },
	} = useRoute<RouteProp<Params>>()

	if (!id) {
		throw new Error('ID required for this Screen!')
	}

	const {
		media: books,
		hasNextPage,
		fetchNextPage,
	} = useMediaCursorQuery({
		params: {
			series: {
				id,
			},
		},
	})

	const handleFetchMore = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	return (
		<ScreenRootView>
			<FlatList
				className="w-full"
				data={books}
				renderItem={({ item }) => <SeriesBookLink book={item} />}
				keyExtractor={(item) => item.id}
				ItemSeparatorComponent={() => <View className="h-px bg-gray-50 dark:bg-gray-900" />}
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
			/>
		</ScreenRootView>
	)
}
