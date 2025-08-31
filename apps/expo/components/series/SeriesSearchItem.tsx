import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment SeriesSearchItem on Series {
		id
		resolvedName
		thumbnail {
			url
		}
		readCount
		mediaCount
		percentageCompleted
	}
`)

export type ISeriesSearchItemFragment = FragmentType<typeof fragment>

type Props = {
	/**
	 * The query which was used that this series matches with. It will attempt to highlight
	 * the matching text in the title and/or description
	 */
	search?: string
	/**
	 * The series to display
	 */
	series: FragmentType<typeof fragment>
}

export default function SeriesSearchItem({ series }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { width } = useDisplay()

	const data = useFragment(fragment, series)
	const router = useRouter()

	return (
		<Pressable
			onPress={() => router.navigate(`/server/${serverID}/series/${data.id}`)}
			style={{
				width: width * 0.75,
			}}
		>
			<View className="flex-row items-start gap-4 py-4">
				<FasterImage
					source={{
						url: data.thumbnail.url,
						headers: {
							Authorization: sdk.authorizationHeader || '',
						},
						resizeMode: 'fill',
						borderRadius: 8,
					}}
					style={{ width: 75, height: 75 / (2 / 3) }}
				/>

				<View className="flex flex-1 flex-col gap-1">
					<Text>{data.resolvedName}</Text>

					<Text className="text-foreground-muted">
						{data.readCount}/{data.mediaCount} books • {data.percentageCompleted}%
					</Text>
				</View>
			</View>
		</Pressable>
	)
}
