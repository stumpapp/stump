import { useSDK } from '@stump/client'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import { LinearGradientProps } from 'react-native-linear-gradient'

import { ThumbnailImage, ThumbnailPlaceholderData } from '../../image'
import { Heading, Progress, Text } from '../../ui'
import { useListRowItemSize } from './useListRowItemSize'

type Props = {
	uri: string
	title: string
	onPress: () => void
	placeholderData?: ThumbnailPlaceholderData | null
	originalDimensions?: { width: number; height: number } | null
	percentageCompleted?: number | null // 1-100
	numberOfReads?: number
	infoItems?: React.ReactNode
}

export function ListRowItem({
	uri,
	title,
	onPress,
	percentageCompleted,
	numberOfReads,
	infoItems,
	...thumbnailProps
}: Props) {
	const { sdk } = useSDK()
	const { width: thumbnailWidth, height } = useListRowItemSize()

	const resolvedGradient =
		percentageCompleted == null
			? undefined
			: percentageCompleted < 100
				? READING_GRADIENT
				: COMPLETED_GRADIENT

	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					className="mx-4 gap-4 relative flex-row"
					style={{
						height,
						opacity: pressed ? 0.8 : 1,
					}}
				>
					<ThumbnailImage
						source={{
							uri: uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						size={{ height, width: thumbnailWidth }}
						{...thumbnailProps}
						gradient={resolvedGradient}
					/>

					<View className="gap-2 py-1.5 flex-1 justify-center">
						<Heading numberOfLines={2} className="shrink">
							{title}
						</Heading>

						{infoItems && (
							<View className="gap-2 flex-row items-center">
								{/*{currentPage && (
						<View className="squircle px-2.5 py-0.5 flex-row items-end rounded-full bg-background-surface-secondary">
							<Text size="sm">{`${t('common.page')} ${currentPage}`}</Text>
							<Text size="xs" className="pb-0.5 text-foreground-muted">{` / ${totalPages}`}</Text>
						</View>
					)}*/}

								{/*{size && (
						<View className="squircle px-2.5 py-0.5 rounded-full bg-background-surface-secondary">
							<Text size="sm" className="text-foreground-muted">
								{size}
							</Text>
						</View>
					)}*/}

								{infoItems}
							</View>
						)}

						{percentageCompleted != null && percentageCompleted < 100 && (
							<View className="gap-3 flex-row items-center">
								<Progress
									className="h-1 shrink bg-background-surface-secondary"
									value={percentageCompleted}
									style={{ height: 6, borderRadius: 3 }}
								/>

								<Text size="sm" className="shrink-0 text-foreground-muted">
									{percentageCompleted.toFixed(0)}%
								</Text>
							</View>
						)}
					</View>
				</View>
			)}
		</Pressable>
	)
}

// TODO: yoinked from GridImageItem, move to shared location
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
