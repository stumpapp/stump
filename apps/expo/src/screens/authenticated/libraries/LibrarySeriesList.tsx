import { type RouteProp, useRoute } from '@react-navigation/native'
import { useSeriesCursorQuery } from '@stump/client'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { View } from '@/components'

import LibrarySeriesLink from './LibrarySeriesLink'

type Params = {
	params: {
		id: string
	}
}

export default function LibrarySeriesList() {
	const insets = useSafeAreaInsets()
	const {
		params: { id },
	} = useRoute<RouteProp<Params>>()

	if (!id) {
		throw new Error('ID required for this Screen!')
	}

	const { series } = useSeriesCursorQuery({
		params: {
			library: {
				id,
			},
		},
	})

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
				data={series}
				renderItem={({ item }) => <LibrarySeriesLink series={item} />}
				keyExtractor={(item) => item.id}
			/>
			<StatusBar style="auto" />
		</View>
	)
}
