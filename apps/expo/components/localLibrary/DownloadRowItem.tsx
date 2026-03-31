import { Host, Image } from '@expo/ui/swift-ui'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useRouter } from 'expo-router'
import { BookOpenCheck, CheckCircle2, CircleMinus, Info, Trash } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, Platform, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { epubProgress, imageMeta, syncStatus } from '~/db'
import { useColors } from '~/lib/constants'
import { formatBytes } from '~/lib/format'
import { useDownload } from '~/lib/hooks'
import { useSelectionStore } from '~/stores/selection'

import { ThumbnailImage } from '../image'
import { Heading, Progress, Text } from '../ui'
import { ContextMenu } from '../ui/context-menu/context-menu'
import { Icon } from '../ui/icon'
import { DownloadedBookDetailsSheet } from './DownloadedBookDetailsSheet'
import { SyncIcon } from './sync-icon/SyncIcon'
import { DownloadedFile } from './types'
import { useDownloadRowItemSize } from './useDownloadRowItemSize'
import { getThumbnailPath } from './utils'

type Props = {
	downloadedFile: DownloadedFile
}

export default function DownloadRowItem({ downloadedFile }: Props) {
	const router = useRouter()
	const sheetRef = useRef<TrueSheet>(null)

	const { deleteBook, markAsComplete, clearProgress } = useDownload({
		serverId: downloadedFile.serverId,
	})

	const readProgress = useMemo(() => downloadedFile.readProgress, [downloadedFile])
	const status = syncStatus.safeParse(readProgress?.syncStatus).data
	const thumbnailData = useMemo(
		() => imageMeta.safeParse(downloadedFile.thumbnailMeta).data,
		[downloadedFile.thumbnailMeta],
	)
	const epubProgression = epubProgress.safeParse(readProgress?.epubProgress).data
	const currentPage = useMemo(
		() => readProgress?.page || epubProgression?.locations?.position,
		[readProgress, epubProgression],
	)
	const totalPages = downloadedFile.pages
	const size = downloadedFile.size ? formatBytes(downloadedFile.size) : null

	const colors = useColors()

	const { width, height } = useDownloadRowItemSize()

	const selectionStore = useSelectionStore((state) => ({
		isSelectionMode: state.isSelecting,
		setIsSelecting: state.setIsSelecting,
		onSelectItem: (id: string) => state.toggleSelection(id),
		isSelected: state.isSelected(downloadedFile.id),
	}))

	const iconOpacity = useSharedValue(1)
	const overlayOpacity = useSharedValue(0)

	useEffect(() => {
		iconOpacity.value = withTiming(selectionStore.isSelected ? 0.6 : 1, { duration: 200 })
		overlayOpacity.value = withTiming(selectionStore.isSelected ? 1 : 0, { duration: 150 })
	}, [selectionStore.isSelected, iconOpacity, overlayOpacity])

	const syncIconStyle = useAnimatedStyle(() => ({
		opacity: iconOpacity.value,
	}))
	const overlayStyle = useAnimatedStyle(() => ({
		backgroundColor: colors.foreground.brand + '33',
		borderColor: colors.foreground.brand,
		opacity: overlayOpacity.value,
	}))

	const onPress = useCallback(
		() =>
			selectionStore.isSelectionMode
				? selectionStore.onSelectItem(downloadedFile.id)
				: router.navigate(`/offline/${downloadedFile.id}/read`),
		[router, downloadedFile.id, selectionStore],
	)

	const progression = useMemo(() => {
		if (!readProgress) {
			return { isCompleted: false, hasProgress: false }
		}

		if (totalPages != null && currentPage != null && totalPages > 0 && currentPage >= totalPages) {
			return { isCompleted: true, hasProgress: true }
		}

		if (readProgress.percentage) {
			const parsed = parseFloat(readProgress.percentage)
			if (!isNaN(parsed) && parsed >= 0.99) {
				return { isCompleted: true, hasProgress: true }
			}
		}

		return { isCompleted: false, hasProgress: true }
	}, [readProgress, currentPage, totalPages])

	const handleSelect = useCallback(() => {
		selectionStore.setIsSelecting(true)
		selectionStore.onSelectItem(downloadedFile.id)
	}, [selectionStore, downloadedFile.id])

	const handleMarkAsComplete = useCallback(() => {
		Alert.alert(
			'Mark as Read',
			`Are you sure you want to mark ${downloadedFile.bookName ? `'${downloadedFile.bookName}'` : 'this book'} as read?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Mark as Read',
					onPress: () => markAsComplete(downloadedFile.id, downloadedFile.pages),
				},
			],
		)
	}, [markAsComplete, downloadedFile.id, downloadedFile.pages, downloadedFile.bookName])

	const handleClearProgress = useCallback(() => {
		Alert.alert(
			'Clear Progress',
			`Are you sure you want to clear your current reading of ${downloadedFile.bookName ? `'${downloadedFile.bookName}'` : 'this book'}?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Clear',
					style: 'destructive',
					onPress: () => clearProgress(downloadedFile.id),
				},
			],
		)
	}, [clearProgress, downloadedFile.id, downloadedFile.bookName])

	const handleDelete = useCallback(() => {
		Alert.alert(
			'Delete Book',
			`Are you sure you want to delete '${downloadedFile.bookName ? `'${downloadedFile.bookName}'` : 'this book'}'?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => deleteBook(downloadedFile.id),
				},
			],
		)
	}, [deleteBook, downloadedFile.id, downloadedFile.bookName])

	const getProgress = () => {
		if (!readProgress) {
			return null
		}

		const currentPage = readProgress.page || 0
		const totalPages = downloadedFile.pages || -1
		if (totalPages > 0 && currentPage > 0) {
			return Math.min((currentPage / totalPages) * 100, 100)
		}

		const progressPercentage = readProgress.percentage

		if (progressPercentage) {
			const parsed = parseFloat(progressPercentage)
			if (!isNaN(parsed)) {
				return Math.min(parsed * 100, 100)
			}
		}

		return null
	}

	return (
		<>
			<ContextMenu
				onPress={onPress}
				groups={[
					{
						items: [
							{
								label: 'See Details',
								icon: {
									ios: 'info.circle',
									android: Info,
								},
								onPress: () => sheetRef.current?.present(),
							},
							{
								label: 'Select',
								icon: {
									ios: 'checkmark.circle',
									android: CheckCircle2,
								},
								onPress: handleSelect,
							},
						],
					},
					{
						items: [
							...(!progression.isCompleted
								? [
										{
											label: 'Mark as Read',
											icon: {
												ios: 'book.closed',
												android: BookOpenCheck,
											},
											onPress: handleMarkAsComplete,
										} as const,
									]
								: []),
							...(progression.hasProgress
								? [
										{
											label: 'Clear Progress',
											icon: {
												ios: 'minus.circle',
												android: CircleMinus,
											},
											onPress: handleClearProgress,
										} as const,
									]
								: []),
						],
					},
					{
						items: [
							{
								label: 'Delete Book',
								icon: {
									ios: 'trash',
									android: Trash,
								},
								onPress: handleDelete,
								role: 'destructive',
							},
						],
					},
				]}
			>
				<View className="relative mx-4 flex-row gap-4" style={{ height }}>
					{/* TODO: Use file icons when no thumbnail is available? */}
					<ThumbnailImage
						source={{
							// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when
							// undefined so it's fine
							uri: getThumbnailPath(downloadedFile),
						}}
						size={{ height, width }}
						placeholderData={thumbnailData}
					/>

					<View className="flex-1 justify-center gap-2 py-1.5">
						<View className="flex-row justify-between gap-2">
							<Heading numberOfLines={2} className="shrink">
								{downloadedFile.bookName || 'Untitled'}
							</Heading>

							{status && (
								<Animated.View className="mt-1 shrink-0" style={syncIconStyle}>
									<SyncIcon status={status} />
								</Animated.View>
							)}
						</View>

						<View className="flex-row items-center gap-2">
							{currentPage && (
								<View className="squircle flex-row items-end rounded-full bg-background-surface-secondary px-2.5 py-0.5">
									<Text size="sm">{`Page ${currentPage}`}</Text>
									<Text
										size="xs"
										className="pb-0.5 text-foreground-muted"
									>{` / ${totalPages}`}</Text>
								</View>
							)}

							{size && (
								<View className="squircle rounded-full bg-background-surface-secondary px-2.5 py-0.5">
									<Text size="sm" className="text-foreground-muted">
										{size}
									</Text>
								</View>
							)}
						</View>

						{readProgress && (
							<View className="flex-row items-center gap-3">
								<Progress
									className="h-1 shrink bg-background-surface-secondary"
									value={getProgress()}
									style={{ height: 6, borderRadius: 3 }}
								/>

								<Text size="sm" className="shrink-0 text-foreground-muted">
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
			</ContextMenu>

			<DownloadedBookDetailsSheet ref={sheetRef} downloadedFile={downloadedFile} />
		</>
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
