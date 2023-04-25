import { API } from '@stump/api'
import { useLibrarySeriesQuery } from '@stump/client'
import { Series } from '@stump/types'
import { Stack, useRouter, useSearchParams } from 'expo-router'
import { Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native'

export default function Library() {
	const { id } = useSearchParams()

	const { series } = useLibrarySeriesQuery(id as string)

	return (
		<>
			<Stack.Screen options={{ title: 'Series' }} />
			<SafeAreaView className="flex-1">
				<View className="flex flex-row flex-wrap">
					{series && series.map((series) => <SeriesCard key={series.id} series={series} />)}
				</View>
			</SafeAreaView>
		</>
	)
}

const SeriesCard = ({ series }: { series: Series }) => {
	const router = useRouter()

	const imageUrl = `${API.defaults.baseURL}/series/${series.id}/thumbnail`

	const onPress = () => router.push(`/books/${series.id}`)

	return (
		<TouchableOpacity className="flex h-56 w-1/2 p-2 md:h-64 md:w-52" onPress={onPress}>
			<View className="rounded-md bg-gray-200">
				<View className="flex items-center rounded-md">
					<Image className="h-60 w-full rounded-t-md" source={{ uri: imageUrl }} />
					<Text className="text-md py-2 font-medium">{series.name}</Text>
				</View>
			</View>
		</TouchableOpacity>
	)
}
