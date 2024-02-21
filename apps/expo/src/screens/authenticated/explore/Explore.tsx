import { getMediaThumbnail } from '@stump/api'
import { useMediaCursorQuery } from '@stump/client'
import React, { useCallback } from 'react'
import { FlatList, Image } from 'react-native'

import { Link, ScreenRootView, Text, View } from '@/components'

export default function Explore() {
	const { media: books, hasNextPage, fetchNextPage } = useMediaCursorQuery({})

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
				renderItem={({ item }) => (
					// TODO: Use todo EntityImage to correct this issue
					// <Link
					// 	key={item.id}
					// 	to={{
					// 		params: { params: { id: item.id }, screen: 'BookOverview' },
					// 		screen: 'BookStack',
					// 	}}
					// 	className="w-full max-w-full"
					// >
					// 	<View className="w-full flex-row space-x-2 p-3 text-left">
					// 		<View>
					// 			<Image
					// 				source={{ uri: getMediaThumbnail(item.id) }}
					// 				style={{ height: 50, objectFit: 'scale-down', width: 50 }}
					// 			/>
					// 		</View>

					// 		<View className="w-0 flex-1 flex-grow">
					// 			<Text size="sm" className="shrink-1">
					// 				{item.name}
					// 			</Text>
					// 		</View>
					// 	</View>
					// </Link>

					<Link
						key={item.id}
						to={{
							params: { params: { id: item.id }, screen: 'BookOverview' },
							screen: 'BookStack',
						}}
						className="max-w-full"
					>
						<Text size="sm" className="shrink-1">
							{item.name}
						</Text>
					</Link>
				)}
				ItemSeparatorComponent={() => <View className="h-px bg-gray-50 dark:bg-gray-900" />}
				keyExtractor={(item) => item.id}
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
			/>
		</ScreenRootView>
	)
}
