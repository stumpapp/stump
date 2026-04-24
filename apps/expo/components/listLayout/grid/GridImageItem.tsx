import { useSDK } from '@stump/client'
import { BlurTargetView, BlurView } from 'expo-blur'
import { Check } from 'lucide-react-native'
import { useRef } from 'react'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../../image'
import { ThumbnailPlaceholderData } from '../../image/ThumbnailPlaceholder'
import { Icon, Progress, Text } from '../../ui'
import { COMPLETED_GRADIENT, READING_GRADIENT, REREADING_GRADIENT } from '../shared'
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

	const showNumber = !!numberOfReads && numberOfReads >= 2
	const hasCompleted =
		(percentageCompleted != null && percentageCompleted >= 100) ||
		(!!numberOfReads && numberOfReads >= 1)
	const isReading = percentageCompleted != null && percentageCompleted < 100

	const resolvedGradient = isReading
		? hasCompleted
			? REREADING_GRADIENT
			: READING_GRADIENT
		: hasCompleted
			? COMPLETED_GRADIENT
			: undefined

	const thumbnailHeight = itemWidth / thumbnailRatio

	const blurTargetRef = useRef<View>(null)

	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View className={cn('gap-2 pb-4 flex-1', { 'opacity-80': pressed })}>
					<View style={{ width: itemWidth, height: thumbnailHeight }}>
						<BlurTargetView ref={blurTargetRef}>
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
						</BlurTargetView>

						{isReading && (
							<View className="bottom-2 left-2 right-2 absolute z-30">
								<Progress
									className="h-1 bg-white/40"
									indicatorClassName="bg-[#f5f3ef]"
									value={percentageCompleted}
								/>
							</View>
						)}

						{hasCompleted && (
							<BlurView
								blurTarget={blurTargetRef}
								blurMethod="dimezisBlurView"
								className={cn(
									'right-2 bottom-2 squircle absolute z-30 rounded-full',
									isReading && 'bottom-5',
								)}
								intensity={4}
							>
								<View className="bg-white/30 flex flex-row items-center justify-center">
									{showNumber && (
										<Text
											className="font-bold ml-2 shadow tablet:text-base"
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
										className="shadow m-1 top-[0.7]"
										size={20}
										color="#f5f3ef"
										strokeWidth={2.5}
									/>
								</View>
							</BlurView>
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
