import { type RouteProp, useRoute } from '@react-navigation/native'
import { useMediaCursorQuery } from '@stump/client'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback } from 'react'
import { FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { View } from '@/components'

import SeriesBookLink from './SeriesBookLink'

type Params = {
	params: {
		id: string
	}
}

export default function LibrarySeriesBookList() {
	const insets = useSafeAreaInsets()
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
		<View
			className="flex-1 items-center justify-center"
			style={{
				paddingBottom: insets.bottom,
				paddingLeft: insets.left,
				paddingRight: insets.right,
				paddingTop: insets.top,
			}}
		>
			<FlatList
				data={books}
				renderItem={({ item }) => <SeriesBookLink books={item} />}
				keyExtractor={(item) => item.id}
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
			/>
			<StatusBar style="auto" />
		</View>
	)
}
