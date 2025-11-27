import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'

import { COLORS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment RecentlyAddedSeriesItem on Series {
		id
		resolvedName
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
		}
		readCount
		mediaCount
		createdAt
	}
`)

export type IRecentlyAddedSeriesItemFragment = FragmentType<typeof fragment>

type Props = {
	/**
	 * The series to display
	 */
	series: FragmentType<typeof fragment>
}

export default function RecentlyAddedSeriesItem({ series }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const data = useFragment(fragment, series)
	const router = useRouter()

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.2: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	const { url: uri, metadata: placeholderData } = data.thumbnail

	return (
		<Pressable onPress={() => router.push(`/server/${serverID}/series/${data.id}`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<ThumbnailImage
						source={{
							uri: uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height: 160 / thumbnailRatio, width: 160 }}
						gradient={{ colors: gradientColors, locations: gradientLocations }}
						placeholderData={placeholderData}
					/>

					<View className="absolute bottom-0 z-20 w-full p-2">
						<Text
							className="flex-1 flex-wrap text-xl font-bold"
							style={{
								textShadowOffset: { width: 2, height: 1 },
								textShadowRadius: 2,
								textShadowColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 20,
								color: COLORS.dark.foreground.DEFAULT,
							}}
							numberOfLines={0}
						>
							{data.resolvedName}
						</Text>
						<Text
							className="flex-1 flex-wrap font-medium"
							style={{
								textShadowOffset: { width: 2, height: 1 },
								textShadowRadius: 2,
								textShadowColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 20,
								color: COLORS.dark.foreground.subtle,
							}}
							numberOfLines={0}
						>
							{dayjs(data.createdAt).fromNow()}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}
