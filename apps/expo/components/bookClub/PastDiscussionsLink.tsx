import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { ColorSpace, getColor, OKLCH, serialize, set, sRGB } from 'colorjs.io/fn'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import LinearGradient from 'react-native-linear-gradient'

import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'
import { getClubBookThumbnailData } from './utils'

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

const fragment = graphql(`
	fragment PastDiscussionsLink on BookClub {
		previousBook {
			imageUrl
			entity {
				__typename
				id
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
		}
		previousDiscussionsCount
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

export function PastDiscussionsLink({ data }: Props) {
	const loadedData = useFragment(fragment, data)
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { clubId } = useLocalSearchParams<{ clubId: string }>()

	const imageProps = getClubBookThumbnailData(loadedData.previousBook, {
		getHeaders: () => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
	})

	const { isDarkColorScheme } = useColorScheme()

	const backgroundGradient = useMemo(() => {
		const averageColor = imageProps?.placeholderData?.averageColor
		if (!averageColor) return null

		const color = getColor(averageColor)
		set(color, {
			'oklch.l': isDarkColorScheme ? 0.25 : 0.88,
			'oklch.c': (c: number) => Math.min(c / 2, 0.2),
		})
		const mutedColor = serialize(color, { format: 'hex' })

		// TODO(colors): I am not great at color science and def think this can be better,
		// i have putzed around with it for a bit but amm moving on
		const { colors: gradientColors, locations: gradientLocations } = easeGradient({
			colorStops: {
				0: { color: mutedColor },
				1: { color: 'transparent' },
			},
			extraColorStopsPerTransition: 16,
			easing: Easing.bezier(0.42, 0, 1, 1),
		})

		return { colors: gradientColors, locations: gradientLocations }
	}, [imageProps?.placeholderData?.averageColor, isDarkColorScheme])

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	// Note: The lack of a previous book itself doesn't necessarily mean there are no past discussions
	const isLinkDisabled = loadedData.previousDiscussionsCount === 0

	// TODO(book-club): Render generic placeholder for thumb if no image
	// TODO(book-club): Technically possible to have isLinkDisabled && !imageProps, which if
	// the case would basically be an empty card...
	return (
		<Pressable
			onPress={() => router.push(`/server/${serverID}/clubs/${clubId}/archive`)}
			className="w-1/3 shrink-0 tablet:w-[120px]"
			disabled={isLinkDisabled}
		>
			<View className="squircle ios:rounded-[2rem] relative flex-grow flex-row gap-6 overflow-hidden rounded-3xl bg-black/5 p-3 dark:bg-white/10">
				{backgroundGradient && (
					<LinearGradient
						colors={backgroundGradient.colors}
						locations={backgroundGradient.locations}
						useAngle
						angle={135}
						style={{ position: 'absolute', inset: 0 }}
					/>
				)}

				{imageProps && (
					<View className="absolute inset-0 -bottom-3 flex-1 items-center justify-end">
						<ThumbnailImage
							key={imageProps.url}
							source={{
								uri: imageProps?.url || '',
								headers: imageProps?.headers,
							}}
							placeholderData={imageProps?.placeholderData}
							size={{
								width: 65,
								height: 65 / thumbnailRatio,
							}}
							resizeMode="cover"
						/>
					</View>
				)}

				{isLinkDisabled && (
					<View className="items-end justify-end">
						<Text className="text-right text-base font-medium text-foreground-muted">
							No past discussions
						</Text>
					</View>
				)}
			</View>
		</Pressable>
	)
}
