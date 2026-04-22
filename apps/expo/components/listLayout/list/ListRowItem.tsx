import { useSDK } from '@stump/client'
import { Pressable, View } from 'react-native'

import { ThumbnailImage, ThumbnailPlaceholderData } from '../../image'
import { Heading, Progress, Text } from '../../ui'
import { COMPLETED_GRADIENT, READING_GRADIENT } from '../shared'
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

						{infoItems && <View className="gap-2 flex-row items-center">{infoItems}</View>}

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
