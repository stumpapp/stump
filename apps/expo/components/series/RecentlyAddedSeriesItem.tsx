import { FragmentType, graphql, useFragment } from '@stump/graphql'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { COLORS } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'
import SeriesStackedThumbnails from './SeriesStackedThumbnails'

const fragment = graphql(`
	fragment RecentlyAddedSeriesItem on Series {
		id
		resolvedName
		media(take: 3) {
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
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const data = useFragment(fragment, series)
	const router = useRouter()

	const thumbnailData = data.media.map((m) => m.thumbnail)

	return (
		<Pressable onPress={() => router.push(`/server/${serverID}/series/${data.id}`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<SeriesStackedThumbnails width={160} thumbnailData={thumbnailData} />

					<View className="absolute top-0 z-20 w-full px-2.5 py-2">
						<Text
							className="flex-1 flex-wrap text-xl font-bold"
							style={{
								textShadowOffset: { width: 2, height: 1 },
								textShadowRadius: 2,
								textShadowColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 20,
								color: COLORS.dark.foreground.DEFAULT,
							}}
							numberOfLines={2}
						>
							{data.resolvedName}
						</Text>
						<Text
							className="flex-1 flex-wrap font-medium tablet:text-base"
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
