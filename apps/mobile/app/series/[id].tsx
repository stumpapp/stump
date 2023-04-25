import { API } from '@stump/api'
import { useLibrarySeriesQuery } from '@stump/client'
import { Series } from '@stump/types'
import { Link, useSearchParams } from 'expo-router'
import { Image, SafeAreaView, Text, View } from 'react-native'

import { TitleText } from '../../components/primitives/Text'

export default function Library() {
	const { id } = useSearchParams()

	const { series } = useLibrarySeriesQuery(id as string, {})

	return (
		<SafeAreaView className="mx-5 mt-10 flex-1">
			<TitleText text={'Series'} />
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
