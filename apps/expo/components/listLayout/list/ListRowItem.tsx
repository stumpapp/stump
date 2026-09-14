import { useSDK } from '@stump/client'
import { intlFormat } from 'date-fns'
import { Check } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { useTranslate } from '~/lib/hooks'

import { ThumbnailImage, ThumbnailPlaceholderData } from '../../image'
import { Heading, Icon, Progress, Text } from '../../ui'
import { useListRowItemSize } from './useListRowItemSize'

type Props = {
	uri: string
	title: string
	onPress: () => void
	placeholderData?: ThumbnailPlaceholderData | null
	originalDimensions?: { width: number; height: number } | null
	percentageCompleted?: number | null // 1-100
	latestCompletionDate?: Date | null
	numberOfReads?: number
	// TODO: consider a more structured approach like having an InfoItem type that is used to construct the items into
	// a consistent format.
	infoItems?: React.ReactNode
}

export function ListRowItem({
	uri,
	title,
	onPress,
	percentageCompleted,
	latestCompletionDate,
	numberOfReads,
	infoItems,
	...thumbnailProps
}: Props) {
	const { t } = useTranslate()
	const { sdk } = useSDK()
	const { width: thumbnailWidth, height } = useListRowItemSize()

	const showNumber = !!numberOfReads && numberOfReads >= 2

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
					/>

					<View className="gap-2 py-1.5 flex-1 justify-center">
						<Heading numberOfLines={2}>{title}</Heading>

						{infoItems && <View className="gap-2 flex-row items-center">{infoItems}</View>}

						{percentageCompleted != null && percentageCompleted < 100 && (
							<View className="gap-3 flex-row items-center">
								<Progress
									className="shrink"
									trackClassName="bg-black/5 dark:bg-white/10"
									value={percentageCompleted}
									style={{ height: 6, borderRadius: 3 }}
								/>

								<Text size="sm" className="shrink-0 text-foreground-muted">
									{percentageCompleted.toFixed(0)}%
								</Text>
							</View>
						)}

						{percentageCompleted != null && percentageCompleted >= 100 && (
							// i went back and forth between items-end/center, landed on this. I felt the gap at the bottom otherwise was a bit awk
							<View className="gap-3 flex-row items-end justify-between">
								<Text
									size="sm"
									// pl-1 adjusted by eye for the infoItems, could be off
									className="pl-1 shrink-0 text-foreground-muted"
								>
									{latestCompletionDate
										? `${t('common.lastCompleted')} ${intlFormat(latestCompletionDate, {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
											})}`
										: t('common.completed')}
								</Text>

								<View
									className="right-0 squircleflex bg-black/5 dark:bg-white/10 squircle absolute flex-row items-center justify-center rounded-full"
									style={{
										borderRadius: 999, // idky i android having problems with rounded-full here
									}}
								>
									{showNumber && (
										<Text className="font-medium ml-2 text-sm tablet:text-sm text-foreground-muted">
											{numberOfReads}
										</Text>
									)}

									<Icon
										as={Check}
										className="m-1 top-[0.7] text-foreground-muted"
										size={16}
										strokeWidth={2.2}
									/>
								</View>
							</View>
						)}
					</View>
				</View>
			)}
		</Pressable>
	)
}
