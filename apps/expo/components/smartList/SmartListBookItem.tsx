import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { formatBytesSeparate } from '~/lib/format'
import { useDisplay } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Heading, Progress, Text } from '../ui'

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

export default function SmartListBookItem({ book }: Props) {
	const data = useFragment(fragment, book)

	const { sdk } = useSDK()
	const { height, width } = useRowSize()
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

	return (
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}>
			<View className="relative mx-4 flex-row gap-4">
				<ThumbnailImage
					source={{
						uri: data.thumbnail.url,
						headers: {
							...sdk.customHeaders,
							Authorization: sdk.authorizationHeader || '',
						},
					}}
					resizeMode="stretch"
					size={{ height, width }}
					cachePolicy="urlCache"
					placeholderData={data.thumbnail.metadata}
				/>

				<View className="flex-1 justify-center py-1.5">
					<View className="flex shrink gap-0.5">
						<Heading numberOfLines={2}>{data.resolvedName}</Heading>
						<Text className="text-foreground-muted">{renderSubtitle()}</Text>
					</View>

					{data.readProgress && (
						<View className="flex-row items-center gap-4">
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

function useRowSize() {
	const { isTablet } = useDisplay()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const itemHeight = useMemo(() => (isTablet ? 110 : 95), [isTablet])
	const itemWidth = useMemo(() => itemHeight * thumbnailRatio, [itemHeight, thumbnailRatio])

	return {
		height: itemHeight,
		width: itemWidth,
	}
}
