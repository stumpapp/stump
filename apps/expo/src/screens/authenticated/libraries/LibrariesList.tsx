import { useNavigation } from '@react-navigation/native'
import { useLibraries } from '@stump/client'
import { Library } from '@stump/sdk'
import { useCallback } from 'react'
import { FlatList, TouchableOpacity } from 'react-native'

import { ScreenRootView, Text, View } from '@/components'

import { LibraryStackNavigation } from './LibraryStackNavigator'

export default function LibrariesList() {
	const { navigate } = useNavigation<LibraryStackNavigation>()
	const { libraries, isLoading } = useLibraries()

	const handleNavigate = useCallback(
		(id: string) =>
			navigate('LibrarySeries', {
				id,
			}),
		[navigate],
	)

	if (isLoading) {
		return null
	}

	const windowSize = libraries.length > 50 ? libraries.length / 4 : 21

	return (
		<ScreenRootView>
			<FlatList
				className="w-full"
				data={libraries}
				renderItem={({ item }) => (
					<ListItem key={item.id} library={item} navigate={handleNavigate} />
				)}
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
				keyExtractor={(item) => item.id}
				maxToRenderPerBatch={windowSize}
				windowSize={windowSize}
			/>
		</ScreenRootView>
	)
}

const ITEM_HEIGHT = 60
const SEPARATOR_HEIGHT = 1

type ListItemProps = {
	library: Library
	navigate: (id: string) => void
}
const ListItem = React.memo(({ library, navigate }: ListItemProps) => (
	<TouchableOpacity
		key={library.id}
		className="w-full flex-row items-center space-x-3 px-4"
		style={{ height: ITEM_HEIGHT, minHeight: ITEM_HEIGHT }}
		onPress={() => navigate(library.id)}
	>
		<View className="flex-1">
			<Text size="sm">{library.name}</Text>
		</View>
	</TouchableOpacity>
))
ListItem.displayName = 'ListItem'
