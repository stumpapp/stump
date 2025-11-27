import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { memo } from 'react'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'

import { COLORS } from '~/lib/constants'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment OnDeckBookItem on Media {
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
		seriesPosition
		series {
			mediaCount
		}
	}
`)

export type OnDeckBookItemFragmentType = FragmentType<typeof fragment>

type Props = {
	book: OnDeckBookItemFragmentType
}

function OnDeckBookItem({ book }: Props) {
	const data = useFragment(fragment, book)

	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { height, width } = useListItemSize()

	const router = useRouter()

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
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<ThumbnailImage
						source={{
							uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ width, height }}
						gradient={{ colors: gradientColors, locations: gradientLocations }}
						placeholderData={placeholderData}
					/>

					<View className="absolute bottom-0 z-20 w-full gap-1 p-2">
						<Text
							className="flex-1 flex-wrap text-lg font-semibold leading-5"
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

						{data.seriesPosition != null && (
							<Text
								className="flex-1 flex-wrap text-sm font-medium"
								style={{
									textShadowOffset: { width: 2, height: 1 },
									textShadowRadius: 2,
									textShadowColor: 'rgba(0, 0, 0, 0.5)',
									zIndex: 20,
									color: COLORS.dark.foreground.subtle,
								}}
								numberOfLines={0}
							>
								Book {data.seriesPosition} of {data.series?.mediaCount ?? '?'}
							</Text>
						)}
					</View>
				</View>
			)}
		</Pressable>
	)
}

export default memo(OnDeckBookItem)
