import { useLibraries } from '@stump/client'
import React from 'react'
import { FlatList } from 'react-native'

import { ScreenRootView, View } from '@/components'

import LibraryListLink from './LibraryListLink'

export default function LibrariesList() {
	const { libraries, isLoading } = useLibraries()

	if (isLoading) {
		return null
	}

	return (
		<ScreenRootView>
			<FlatList
				data={libraries}
				renderItem={({ item }) => <LibraryListLink library={item} />}
				ItemSeparatorComponent={() => <View className="h-px bg-gray-50 dark:bg-gray-900" />}
				keyExtractor={(item) => item.id}
				className="w-full"
			/>
		</ScreenRootView>
	)
}
