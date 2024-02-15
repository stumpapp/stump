import { useLibraries } from '@stump/client'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { View } from '@/components'

import LibraryListLink from './LibraryListLink'

export default function LibrariesList() {
	const insets = useSafeAreaInsets()

	const { libraries, isLoading } = useLibraries()

	if (isLoading) {
		return null
	}

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
				data={libraries}
				renderItem={({ item }) => <LibraryListLink library={item} />}
				keyExtractor={(item) => item.id}
			/>
			<StatusBar style="auto" />
		</View>
	)
}
