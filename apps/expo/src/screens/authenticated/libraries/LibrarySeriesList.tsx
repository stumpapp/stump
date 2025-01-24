import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { useSeriesCursorQuery } from '@stump/client'
import { Series } from '@stump/sdk'
import React, { useCallback } from 'react'
import { FlatList, TouchableOpacity } from 'react-native'

import { ScreenRootView, Text, View } from '@/components'

import { LibraryStackNavigation, LibraryStackScreenParams } from './LibraryStackNavigator'

type Params = {
	params: LibraryStackScreenParams
}

export default function LibrarySeriesList() {
	const { navigate } = useNavigation<LibraryStackNavigation>()
	const {
		params: { id },
	} = useRoute<RouteProp<Params>>()

	if (!id) {
		throw new Error('ID required for this Screen!')
	}

	const handleNavigate = useCallback(
		(id: string) =>
			navigate('SeriesBooks', {
				id,
			}),
		[navigate],
	)

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

	const windowSize = series.length > 50 ? series.length / 4 : 21

	return (
		<ScreenRootView>
			<FlatList
				data={series}
				renderItem={({ item }) => (
					<ListItem key={item.id} series={item} navigate={handleNavigate} />
				)}
				keyExtractor={(item) => item.id}
				className="w-full"
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
				getItemLayout={(_, index) => ({
					index,
					length: ITEM_HEIGHT,
					offset: ITEM_HEIGHT * index + SEPARATOR_HEIGHT,
				})}
				ItemSeparatorComponent={() => (
					<View
						className="bg-gray-50 dark:bg-gray-900"
						style={{
							height: SEPARATOR_HEIGHT,
						}}
					/>
				)}
				maxToRenderPerBatch={windowSize}
				windowSize={windowSize}
			/>
		</ScreenRootView>
	)
}

const ITEM_HEIGHT = 60
const SEPARATOR_HEIGHT = 1

type ListItemProps = {
	series: Series
	navigate: (id: string) => void
}
const ListItem = React.memo(({ series: { id, name, metadata }, navigate }: ListItemProps) => {
	const title = metadata?.title || name
	return (
		<TouchableOpacity
			key={id}
			className="w-full flex-row items-center space-x-3 px-4"
			style={{ height: ITEM_HEIGHT, minHeight: ITEM_HEIGHT }}
			onPress={() => navigate(id)}
		>
			<View className="flex-1">
				<Text size="sm">{title}</Text>
			</View>
		</TouchableOpacity>
	)
})
ListItem.displayName = 'ListItem'
