import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'

import { COLORS } from '~/lib/constants'
import { formatBytesSeparate } from '~/lib/format'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Progress, Text } from '../ui'
import { useSmartListItemsSize } from './useSmartListItemsSize'

const fragment = graphql(`
	fragment SmartListBookItem on Media {
		id
		resolvedName
		name
		readProgress {
			page
			percentageCompleted
			locator {
				chapterTitle
			}
		}
		pages
		size
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
`)

type Props = {
	book: FragmentType<typeof fragment>
}

// TODO: I've used this pattern of dynamic grid/list item twice now, might be worth
// abstracting into a slotted component for better reuse

export default function SmartListBookItem({ book }: Props) {
	const data = useFragment(fragment, book)
	const layout = usePreferencesStore((state) => state.smartListLayout)

	const { sdk } = useSDK()
	const { itemWidth, thumbnailWidth, thumbnailHeight, paddingHorizontal } = useSmartListItemsSize()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const router = useRouter()

	const renderSubtitle = () => {
		const parts = []

		if (data.size != null) {
			const size = formatBytesSeparate(data.size, 1)
			if (size) {
				parts.push(`${size.value} ${size.unit}`)
			}
		}

		if (data.pages != null && data.pages > 0) {
			if (data.readProgress?.page) {
				parts.push(`Page ${data.readProgress.page} of ${data.pages}`)
			} else {
				parts.push(`${data.pages} pages`)
			}
		}

		const epubProgression = data.readProgress?.locator
		// Avoid adding title if the chapter isn't named properly
		if (
			epubProgression?.chapterTitle &&
			!epubProgression.chapterTitle.match(/\.(html|xml|xhtml)$/i)
		) {
			parts.push(epubProgression.chapterTitle)
		}

		return parts.join(' • ')
	}

	const getProgress = () => {
		if (!data.readProgress) {
			return null
		}

		const currentPage = data.readProgress.page || 0
		const totalPages = data.pages || -1
		if (totalPages > 0 && currentPage > 0) {
			return Math.min((currentPage / totalPages) * 100, 100)
		}

		const progressPercentage = data.readProgress.percentageCompleted

		if (progressPercentage) {
			const parsed = parseFloat(progressPercentage)
			if (!isNaN(parsed)) {
				return Math.min(parsed * 100, 100)
			}
		}

		return null
	}

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.5: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	const gradient =
		data.readProgress && layout === 'grid'
			? { colors: gradientColors, locations: gradientLocations }
			: undefined

	return (
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}>
			<View
				className={cn('relative items-center gap-2', {
					'flex-row gap-4': layout === 'list',
				})}
				style={{
					paddingHorizontal,
				}}
			>
				<View className="relative items-center">
					<ThumbnailImage
						source={{
							uri: data.thumbnail.url,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height: thumbnailHeight, width: thumbnailWidth }}
						cachePolicy="urlCache"
						placeholderData={data.thumbnail.metadata}
						gradient={gradient}
					/>

					{data.readProgress && layout === 'grid' && (
						<View className="absolute bottom-4 z-10 w-full gap-1 px-4">
							<Text
								className="flex-wrap text-base tablet:text-lg"
								style={{
									color: COLORS.dark.foreground.subtle,
									opacity: 0.9,
								}}
							>
								{getProgress()?.toFixed(0)}%
							</Text>

							<Progress
								className="h-1 bg-[#898d94]"
								indicatorClassName="bg-[#f5f3ef]"
								value={getProgress()}
								style={{ height: 6, borderRadius: 3 }}
							/>
						</View>
					)}
				</View>

				<View
					style={{
						width: layout === 'grid' ? itemWidth - 8 : undefined,
						flex: layout === 'list' ? 1 : undefined,
						flexShrink: layout === 'list' ? 1 : undefined,
					}}
				>
					<Text
						size="xl"
						className={cn('font-medium leading-6', {
							'text-left': layout === 'grid',
						})}
						numberOfLines={2}
						ellipsizeMode="tail"
					>
						{data.resolvedName}
					</Text>

					{layout === 'list' && <Text className="text-foreground-muted">{renderSubtitle()}</Text>}

					{data.readProgress && layout === 'list' && (
						<View className="flex-row items-center gap-4 pt-4">
							<Progress
								className="h-1 shrink bg-background-surface-secondary"
								value={getProgress()}
								style={{ height: 6, borderRadius: 3 }}
							/>

							<Text className="shrink-0 text-foreground-muted">
								{(getProgress() || 0).toFixed(0)}%
							</Text>
						</View>
					)}
				</View>
			</View>
		</Pressable>
	)
}
