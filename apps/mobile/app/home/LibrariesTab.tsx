import { API } from '@stump/api'
import { useLibraries } from '@stump/client'
import { Library } from '@stump/types'
import { Link } from 'expo-router'
import { Image, Text, View } from 'react-native'

export default function LibrariesTab() {
	const { libraries } = useLibraries()

	return (
		<View className="flex-1">
			<View className="flex flex-row flex-wrap">
				{libraries &&
					libraries.map((library) => <LibraryCard key={library.id} library={library} />)}
			</View>
		</View>
	)
}

const LibraryCard = ({ library }: { library: Library }) => {
	const imageUrl = `${API.defaults.baseURL}/libraries/${library.id}/thumbnail`
	return (
		<Link
			href={`/series/${library.id}`}
			className="m-2 flex h-80 w-52 items-center rounded-md bg-gray-200"
		>
			<View className="m-2 flex h-80 w-52 items-center rounded-md bg-gray-200">
				<Image className="h-72 w-full rounded-t-md" source={{ uri: imageUrl }} />
				<Text className="text-md py-2 font-medium">{library.name}</Text>
			</View>
		</Link>
	)
}
