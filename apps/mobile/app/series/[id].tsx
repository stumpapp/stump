import { API } from '@stump/api'
import { useLibrarySeries } from '@stump/client'
import { Series } from '@stump/types'
import { Link, useSearchParams } from 'expo-router'
import { Image, SafeAreaView, Text, View } from 'react-native'

export default function Library() {
	const { id } = useSearchParams()

	const { series } = useLibrarySeries(id as string)

	return (
		<SafeAreaView className="mx-5 mt-10 flex-1">
			<Text className="text-2xl font-semibold">Series</Text>
			<View className="mt-5 flex flex-row flex-wrap">
				{series && series.map((series) => <SeriesCard key={series.id} series={series} />)}
			</View>
		</SafeAreaView>
	)
}

const SeriesCard = ({ series }: { series: Series }) => {
	const imageUrl = `${API.defaults.baseURL}/series/${series.id}/thumbnail`
	return (
		<Link
			href={`/books/${series.id}`}
			className="m-2 flex h-80 w-52 items-center rounded-md bg-gray-200"
		>
			<View className="m-2 flex h-80 w-52 items-center rounded-md bg-gray-200">
				<Image className="h-72 w-full rounded-t-md" source={{ uri: imageUrl }} />
				<Text className="text-md py-2 font-medium">{series.name}</Text>
			</View>
		</Link>
	)
}
