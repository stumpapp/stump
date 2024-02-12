import { API } from '@stump/api'
import { useSeriesMediaQuery } from '@stump/client'
import { Media } from '@stump/types'
import { Stack, useRouter, useSearchParams } from 'expo-router'
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native'

export default function Library() {
	const { id } = useSearchParams()

	const { media } = useSeriesMediaQuery(id as string)

	return (
		<>
			<Stack.Screen options={{ title: 'Media' }} />
			<ScrollView>
				<SafeAreaView className="flex-1">
					<View className="flex flex-row flex-wrap">
						{media && media.map((media) => <SeriesCard key={media.id} media={media} />)}
					</View>
				</SafeAreaView>
			</ScrollView>
		</>
	)
}

const SeriesCard = ({ media }: { media: Media }) => {
	const imageUrl = `${API.defaults.baseURL}/media/${media.id}/thumbnail`

	const onPress = () => {}

	return (
		<TouchableOpacity className="mb-16 flex h-56 w-1/2 p-2 md:h-64 md:w-52" onPress={onPress}>
			<View className="rounded-md bg-gray-200">
				<View className="flex items-center rounded-md">
					<Image className="h-60 w-full rounded-t-md" source={{ uri: imageUrl }} />
					<Text className="text-md py-2 font-medium">{media.name}</Text>
				</View>
			</View>
		</TouchableOpacity>
	)
}
