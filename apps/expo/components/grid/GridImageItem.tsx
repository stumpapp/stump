import { useSDK } from '@stump/client'
import { Check } from 'lucide-react-native'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import { LinearGradientProps } from 'react-native-linear-gradient'

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
	numberOfReads?: number
}

export default function GridImageItem({
	uri,
	title,
	onPress,
	percentageCompleted,
	numberOfReads,
	...thumbnailProps
}: Props) {
	const { sdk } = useSDK()
	const { itemWidth } = useGridItemSize()

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const resolvedGradient =
		percentageCompleted == null
			? undefined
			: percentageCompleted < 100
				? READING_GRADIENT
				: COMPLETED_GRADIENT

	const thumbnailHeight = itemWidth / thumbnailRatio

	const showNumber = !!numberOfReads && numberOfReads >= 2

	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View className={cn('gap-2 pb-4 flex-1', { 'opacity-80': pressed })}>
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
							gradient={resolvedGradient}
						/>

						{percentageCompleted != null && percentageCompleted < 100 && (
							<View className="bottom-2 left-2 right-2 absolute z-30">
								<Progress
									className="h-1 bg-white/40"
									indicatorClassName="bg-[#f5f3ef]"
									value={percentageCompleted}
								/>
							</View>
						)}

						{percentageCompleted != null && percentageCompleted >= 100 && (
							<View
								className="bottom-2 right-2 bg-white/40 p-1 gap-1 squircle absolute z-30 flex flex-row items-center justify-center rounded-full"
								style={{
									borderRadius: 999, // idky i android having problems with rounded-full here
								}}
							>
								{showNumber && (
									<Text
										className="font-bold pl-1.5 shadow"
										style={{
											color: '#f5f3ef',
										}}
									>
										{numberOfReads}
									</Text>
								)}

								<Icon
									as={Check}
									// This icon looks optically off center so I've adjusted it down a bit
									className="shadow top-[0.7]"
									size={20}
									color="#f5f3ef"
									strokeWidth={2.5}
								/>
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

const COMPLETED_GRADIENT = {
	...easeGradient({
		colorStops: {
			0.7: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.70)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.4, 0, 0.6, 1),
	}),
	useAngle: true,
	angle: 150,
} satisfies LinearGradientProps

const READING_GRADIENT = easeGradient({
	colorStops: {
		0.8: { color: 'transparent' },
		1: { color: 'rgba(0, 0, 0, 0.70)' },
	},
	extraColorStopsPerTransition: 16,
	easing: Easing.bezier(0.42, 0, 0.7, 1),
}) satisfies LinearGradientProps
