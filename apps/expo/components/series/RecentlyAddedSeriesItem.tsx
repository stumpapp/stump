import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
import { Heading, Text } from '../ui'
import dayjs from 'dayjs'
import LinearGradient from 'react-native-linear-gradient'

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
	const { width } = useDisplay()

	const data = useFragment(fragment, series)
	const router = useRouter()

	return (
		<Pressable
			className="relative aspect-[2/3] shrink-0 overflow-hidden"
			onPress={() => router.navigate(`/server/${serverID}/series/${data.id}`)}
			style={{
				width: 240 * (2 / 3),
			}}
		>
			<LinearGradient
				colors={['transparent', 'rgba(0, 0, 0, 0.80)']}
				style={{ position: 'absolute', inset: 0, zIndex: 10 }}
			/>

			<FasterImage
				source={{
					url: data.thumbnail.url,
					headers: {
						Authorization: sdk.authorizationHeader || '',
					},
					resizeMode: 'fill',
					borderRadius: 8,
				}}
				style={{ height: 240, width: 240 * (2 / 3) }}
			/>

			<View className="absolute bottom-0 z-20 w-full p-2">
				<Text
					className="flex-1 flex-wrap text-xl font-bold text-foreground"
					style={{
						textShadowOffset: { width: 2, height: 1 },
						textShadowRadius: 2,
						textShadowColor: 'rgba(0, 0, 0, 0.5)',
						zIndex: 20,
					}}
					numberOfLines={0}
				>
					{data.resolvedName}
				</Text>
				<Text
					className="flex-1 flex-wrap font-medium text-foreground-subtle"
					style={{
						textShadowOffset: { width: 2, height: 1 },
						textShadowRadius: 2,
						textShadowColor: 'rgba(0, 0, 0, 0.5)',
						zIndex: 20,
					}}
					numberOfLines={0}
				>
					{dayjs(data.createdAt).fromNow()}
				</Text>
			</View>
		</Pressable>
	)

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
						{data.readCount}/{data.mediaCount} books • {dayjs(data.createdAt).fromNow()}
					</Text>
				</View>
			</View>
		</Pressable>
	)
}
