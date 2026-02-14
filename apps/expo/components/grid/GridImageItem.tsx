import { useSDK } from '@stump/client'
import { Href, useRouter } from 'expo-router'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'

import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../image'
import { ThumbnailPlaceholderData } from '../image/ThumbnailPlaceholder'
import { Text } from '../ui'
import { useGridItemSize } from './useGridItemSize'

type Props = {
	uri: string
	title: string
	href: Href
	placeholderData?: ThumbnailPlaceholderData | null
	percentageCompleted?: number | null
}

export default function GridImageItem({
	uri,
	title,
	href,
	percentageCompleted,
	...thumbnailProps
}: Props) {
	const { sdk } = useSDK()
	const { itemWidth } = useGridItemSize()

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.5: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	const gradient =
		percentageCompleted != null && percentageCompleted > 0
			? { colors: gradientColors, locations: gradientLocations }
			: undefined

	return (
		<Pressable onPress={() => router.navigate(href)}>
			{({ pressed }) => (
				<View className={cn('flex-1 gap-2 pb-4', { 'opacity-80': pressed })}>
					<ThumbnailImage
						source={{
							uri: uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height: itemWidth / thumbnailRatio, width: itemWidth }}
						{...thumbnailProps}
						gradient={gradient}
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
