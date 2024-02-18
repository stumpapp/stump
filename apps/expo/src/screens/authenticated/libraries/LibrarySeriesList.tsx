import { type RouteProp, useRoute } from '@react-navigation/native'
import { useSeriesCursorQuery } from '@stump/client'
import React, { useCallback } from 'react'
import { FlatList } from 'react-native'

import { ScreenRootView, View } from '@/components'

import LibrarySeriesLink from './LibrarySeriesLink'

type Params = {
	params: {
		id: string
	}
}

export default function LibrarySeriesList() {
	const {
		params: { id },
	} = useRoute<RouteProp<Params>>()

	if (!id) {
		throw new Error('ID required for this Screen!')
	}

	const { series, hasNextPage, fetchNextPage } = useSeriesCursorQuery({
		params: {
			library: {
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
				data={series}
				renderItem={({ item }) => <LibrarySeriesLink series={item} />}
				ItemSeparatorComponent={() => <View className="h-px bg-gray-50 dark:bg-gray-900" />}
				keyExtractor={(item) => item.id}
				className="w-full"
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
			/>
		</ScreenRootView>
	)
}
