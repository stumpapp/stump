import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { Easing, Platform, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import { Pressable } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'

import { COLORS } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment RecentlyAddedSeriesItem on Series {
		id
		resolvedName
		thumbnail {
			url
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

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.2: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	return (
		<Pressable
			className="relative shrink-0"
			onPress={() => router.push(`/server/${serverID}/series/${data.id}`)}
			style={{
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.2,
				shadowRadius: 1.41,
				borderRadius: 8,
			}}
		>
			<LinearGradient
				colors={gradientColors}
				style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 8 }}
				locations={gradientLocations}
			/>

			<FasterImage
				source={{
					url: data.thumbnail.url,
					headers: {
						Authorization: sdk.authorizationHeader || '',
					},
					resizeMode: 'fill',
					// FIXME: I REALLY shouldn't have to do this
					borderRadius: Platform.OS === 'android' ? 24 : 8,
				}}
				style={{ width: 240 * (2 / 3), height: 240 }}
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
		</Pressable>
	)

	// return (
	// 	<Pressable
	// 		onPress={() => router.navigate(`/server/${serverID}/series/${data.id}`)}
	// 		style={{
	// 			width: width * 0.75,
	// 		}}
	// 	>
	// 		<View className="flex-row items-start gap-4 py-4">
	// 			<FasterImage
	// 				source={{
	// 					url: data.thumbnail.url,
	// 					headers: {
	// 						Authorization: sdk.authorizationHeader || '',
	// 					},
	// 					resizeMode: 'fill',
	// 					borderRadius: 8,
	// 				}}
	// 				style={{ width: 75, height: 75 / (2 / 3) }}
	// 			/>

	// 			<View className="flex flex-1 flex-col gap-1">
	// 				<Text>{data.resolvedName}</Text>

	// 				<Text className="text-foreground-muted">
	// 					{data.readCount}/{data.mediaCount} books • {dayjs(data.createdAt).fromNow()}
	// 				</Text>
	// 			</View>
	// 		</View>
	// 	</Pressable>
	// )
}
