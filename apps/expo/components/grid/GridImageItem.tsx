import { useSDK } from '@stump/client'
import { Check } from 'lucide-react-native'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'

import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../image'
import { ThumbnailPlaceholderData } from '../image/ThumbnailPlaceholder'
import { Icon, Progress, Text } from '../ui'
import { useGridItemSize } from './useGridItemSize'

type Props = {
	uri: string
	title: string
	onPress: () => void
	placeholderData?: ThumbnailPlaceholderData | null
	originalDimensions?: { width: number; height: number } | null
	percentageCompleted?: number | null // 1-100
}

export default function GridImageItem({
	uri,
	title,
	onPress,
	percentageCompleted,
	...thumbnailProps
}: Props) {
	const { sdk } = useSDK()
	const { itemWidth } = useGridItemSize()

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
		percentageCompleted != null
			? { colors: gradientColors, locations: gradientLocations }
			: undefined

	const thumbnailHeight = itemWidth / thumbnailRatio

	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View className={cn('flex-1 gap-2 pb-4', { 'opacity-80': pressed })}>
					<View style={{ width: itemWidth, height: thumbnailHeight }}>
						<ThumbnailImage
							source={{
								uri: uri,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							size={{ height: thumbnailHeight, width: itemWidth }}
							{...thumbnailProps}
							gradient={gradient}
						/>

						{percentageCompleted != null && percentageCompleted < 100 && (
							<View className="absolute bottom-2 left-2 right-2 z-30">
								<Progress
									className="h-1 bg-[#898d94]"
									indicatorClassName="bg-[#f5f3ef]"
									value={percentageCompleted}
								/>
							</View>
						)}

						{percentageCompleted != null && percentageCompleted >= 100 && (
							<View
								className="absolute bottom-2 right-2 z-30 flex items-center justify-center rounded-full bg-white/75 p-1.5 dark:bg-black/50"
								style={{
									borderRadius: 999, // idky i android having problems with rounded-full here
								}}
							>
								<Icon as={Check} className="shadow" size={20} />
							</View>
						)}
					</View>

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
