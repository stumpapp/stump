import { Host, Image } from '@expo/ui/swift-ui'
import { useRouter } from 'expo-router'
import { CheckCircle2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { syncStatus } from '~/db'
import { useColors } from '~/lib/constants'
import { formatBytesSeparate } from '~/lib/format'
import { useListItemSize } from '~/lib/hooks'
import { useSelectionStore } from '~/stores/selection'

import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
import { Heading, Progress, Text } from '../ui'
import { Icon } from '../ui/icon'
import { SyncIcon } from './sync-icon/SyncIcon'
import { DownloadedFile } from './types'
import { getThumbnailPath } from './utils'

type Props = {
	downloadedFile: DownloadedFile
}

export default function DownloadRowItem({ downloadedFile }: Props) {
	const router = useRouter()

	const thumbnailPath = useMemo(() => getThumbnailPath(downloadedFile), [downloadedFile])

	const readProgress = useMemo(() => downloadedFile.readProgress, [downloadedFile])
	const status = syncStatus.safeParse(readProgress?.syncStatus).data

	const colors = useColors()

	const { width, height } = useListItemSize()

	const selectionStore = useSelectionStore((state) => ({
		isSelectionMode: state.isSelecting,
		onSelectItem: (id: string) => state.toggleSelection(id),
		isSelected: state.isSelected(downloadedFile.id),
	}))

	const iconOpacity = useSharedValue(1)
	const syncIconStyle = useAnimatedStyle(() => ({
		opacity: iconOpacity.value,
	}))

	const overlayOpacity = useSharedValue(0)
	const overlayStyle = useAnimatedStyle(() => ({
		backgroundColor: colors.foreground.brand + '33',
		borderColor: colors.foreground.brand,
		opacity: overlayOpacity.value,
	}))

	useEffect(() => {
		iconOpacity.value = withTiming(selectionStore.isSelected ? 0.6 : 1, { duration: 200 })
		overlayOpacity.value = withTiming(selectionStore.isSelected ? 1 : 0, { duration: 150 })
	}, [selectionStore.isSelected, iconOpacity, overlayOpacity])

	const onPress = useCallback(
		() =>
			selectionStore.isSelectionMode
				? selectionStore.onSelectItem(downloadedFile.id)
				: router.navigate(`/offline/${downloadedFile.id}/read`),
		[router, downloadedFile.id, selectionStore],
	)

	// Note: I went back and forth on which order to show these pieces of info in the subtitle.
	// The big thing in my mind was that I see page/progression more "important" than size but wasn't
	// sure if being towards the inside vs outside made it more prominent or noticeable.
	const renderSubtitle = () => {
		const parts = []

		if (downloadedFile.size != null) {
			const size = formatBytesSeparate(downloadedFile.size, 1)
			if (size) {
				parts.push(`${size.value} ${size.unit}`)
			}
		}

		if (downloadedFile.pages != null && downloadedFile.pages > 0) {
			if (readProgress?.page) {
				parts.push(`Page ${readProgress.page} of ${downloadedFile.pages}`)
			} else {
				parts.push(`${downloadedFile.pages} pages`)
			}
		}

		// TODO: Re-add chapter title when it is more reliably something meaningful. I find that for some books
		// it is showing the resource name instead of the actual chapter which I don't want to show
		// const readiumProgress = epubProgress.safeParse(readProgress?.percentage).data
		// if (readiumProgress?.chapterTitle) {
		// 	parts.push(readiumProgress.chapterTitle)
		// }

		return parts.join(' • ')
	}

	const getProgress = () => {
		if (!readProgress) {
			return null
		}

		const currentPage = readProgress.page || 0
		const totalPages = downloadedFile.pages || -1
		if (totalPages > 0 && currentPage > 0) {
			return Math.min((currentPage / totalPages) * 100, 100)
		}

		const epubProgress = readProgress.percentage

		if (epubProgress) {
			const parsed = parseFloat(epubProgress)
			if (!isNaN(parsed)) {
				return Math.min(parsed * 100, 100)
			}
		}

		return null
	}

	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					// Note: Using margin here so the overlay isn't cut off by edges of device
					className="white relative mx-4 flex-row gap-4"
					style={{ opacity: pressed && !selectionStore.isSelectionMode ? 0.8 : 1 }}
				>
					<BorderAndShadow
						style={{ borderRadius: 4, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
					>
						{/* TODO: Use file icons when no thumbnail is available? */}
						<TurboImage
							source={{
								// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when
								// undefined so it's fine
								uri: thumbnailPath,
							}}
							resizeMode="stretch"
							resize={(width / 2) * 1.5}
							style={{ height: height / 2, width: width / 2 }}
						/>
					</BorderAndShadow>

					<View className="flex-1 justify-center py-2">
						<View className="flex flex-1 flex-row justify-between gap-2">
							<View className="flex shrink gap-1">
								<Heading numberOfLines={2}>{downloadedFile.bookName || 'Untitled'}</Heading>
								<Text className="text-foreground-muted">{renderSubtitle()}</Text>
							</View>

							{status && (
								<Animated.View className="mt-1 shrink-0" style={syncIconStyle}>
									<SyncIcon status={status} />
								</Animated.View>
							)}
						</View>

						{readProgress && (
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

					<Animated.View
						className="squircle absolute inset-0 z-10 -m-1 rounded-lg border-2"
						style={overlayStyle}
					>
						<View className="flex flex-1 items-center justify-center">{CheckIcon}</View>
					</Animated.View>
				</View>
			)}
		</Pressable>
	)
}

const CheckIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="checkmark.circle.fill" size={32} />
		</Host>
	),
	android: <Icon as={CheckCircle2} size={32} className="text-fill-brand shadow" />,
})
