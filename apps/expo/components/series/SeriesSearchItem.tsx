import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { useDisplay } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
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
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	return (
		<Pressable
			onPress={() => router.navigate(`/server/${serverID}/series/${data.id}`)}
			style={{
				width: width * 0.75,
			}}
		>
			<View className="flex-row items-start gap-4 px-6 py-2 tablet:px-10">
				<BorderAndShadow
					style={{ borderRadius: 4, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
				>
					<TurboImage
						source={{
							uri: data.thumbnail.url,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						resize={75 * 1.5}
						style={{ height: 75 / thumbnailRatio, width: 75 }}
					/>
				</BorderAndShadow>

				<View className="flex flex-1 flex-col gap-1">
					<Text>{data.resolvedName}</Text>

					<Text className="text-foreground-muted">
						{data.readCount}/{data.mediaCount} books • {data.percentageCompleted.toFixed(1)}%
					</Text>
				</View>
			</View>
		</Pressable>
	)
}
