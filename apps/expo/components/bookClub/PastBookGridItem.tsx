import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'

import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'
import { useBookClubContext } from './context'
import { usePastDiscussionSize } from './usePastDiscussionSize'

const fragment = graphql(`
	fragment PastBookGridItem on BookClubBook {
		id
		imageUrl
		title
		entity {
			__typename
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
		}
		completedAt
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
	messageCount: number
}

export function PastBookGridItem({ data }: Props) {
	const book = useFragment(fragment, data)
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { clubId } = useBookClubContext()
	const { sdk } = useSDK()
	const { itemWidth } = usePastDiscussionSize()

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.5: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	const thumbnailUrl = book.entity?.thumbnail.url || book.imageUrl || undefined
	const title = book.entity?.resolvedName || book.title || 'Unknown'

	const router = useRouter()

	return (
		<Pressable
			onPress={() =>
				router.navigate(`/server/${serverID}/clubs/${clubId}/archive/past-book/${book.id}`)
			}
		>
			{({ pressed }) => (
				<View className={cn('flex-1 items-center gap-2 pb-4', { 'opacity-80': pressed })}>
					<ThumbnailImage
						source={{
							uri: thumbnailUrl || '',
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height: itemWidth / thumbnailRatio, width: itemWidth }}
						placeholderData={book.entity?.thumbnail.metadata}
						gradient={{ colors: gradientColors, locations: gradientLocations }}
					/>

					<Text
						size="xl"
						className="font-medium leading-6"
						numberOfLines={2}
						ellipsizeMode="tail"
						style={{
							maxWidth: itemWidth - 4,
						}}
					>
						{title}
					</Text>
				</View>
			)}
		</Pressable>
	)
}
