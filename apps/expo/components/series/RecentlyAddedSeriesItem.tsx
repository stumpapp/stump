import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { COLORS } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'
import SeriesStackedThumbnails from './SeriesStackedThumbnails'

const fragment = graphql(`
	fragment RecentlyAddedSeriesItem on Series {
		id
		createdAt
		resolvedName
		media(take: 2, skip: 1) {
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
				height
				width
			}
		}
		mediaCount
		readCount
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

	const thumbnailData = [data.thumbnail, ...data.media.map((m) => m.thumbnail)]

	// TODO(oneshots): should this just lead to oneshotBook.id? for mobile feels like it warrants
	// a badge or something to indicate it is a oneshot?
	return (
		<Pressable onPress={() => router.push(`/server/${serverID}/series/${data.id}`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<SeriesStackedThumbnails width={160} thumbnailData={thumbnailData} />

					<View className="top-0 px-2.5 py-2 absolute z-20 w-full">
						<Text
							className="text-xl font-bold flex-1 flex-wrap"
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
							className="font-medium tablet:text-base flex-1 flex-wrap"
							style={{
								textShadowOffset: { width: 2, height: 1 },
								textShadowRadius: 2,
								textShadowColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 20,
								color: COLORS.dark.foreground.subtle,
							}}
							numberOfLines={0}
						>
							{formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}
