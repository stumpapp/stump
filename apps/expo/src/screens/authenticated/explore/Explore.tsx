import { useMediaCursorQuery } from '@stump/client'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback } from 'react'
import { FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Link, View } from '@/components'

export default function Explore() {
	const insets = useSafeAreaInsets()
	const { media: books, hasNextPage, fetchNextPage } = useMediaCursorQuery({})

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
				renderItem={({ item }) => (
					<Link
						to={{ params: { id: item.id }, screen: 'BookStack' }}
						className="max-w-full p-3 text-left"
					>
						{item.name}
					</Link>
				)}
				keyExtractor={(item) => item.id}
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
			/>
			<StatusBar style="auto" />
		</View>
	)
}
