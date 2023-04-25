import { API } from '@stump/api'
import { useLibraries } from '@stump/client'
import { Library } from '@stump/types'
import { Stack, useRouter } from 'expo-router'
import { TouchableOpacity } from 'nativewind/dist/preflight'
import { Image, Text, View } from 'react-native'

export default function LibrariesTab() {
	const { libraries } = useLibraries()

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1">
				<View className="flex flex-row flex-wrap">
					{libraries &&
						libraries.map((library) => <LibraryCard key={library.id} library={library} />)}
				</View>
			</View>
		</>
	)
}

const LibraryCard = ({ library }: { library: Library }) => {
	const router = useRouter()

	const imageUrl = `${API.defaults.baseURL}/libraries/${library.id}/thumbnail`

	const onPress = () => router.push(`/series/${library.id}`)

	return (
		<TouchableOpacity className="flex h-56 w-1/2 p-2 md:h-64 md:w-52" onPress={onPress}>
			<View className="rounded-md bg-gray-200">
				<View className="flex items-center rounded-md">
					<Image className="h-60 w-full rounded-t-md" source={{ uri: imageUrl }} />
					<Text className="text-md py-2 font-medium">{library.name}</Text>
				</View>
			</View>
		</TouchableOpacity>
	)
}
