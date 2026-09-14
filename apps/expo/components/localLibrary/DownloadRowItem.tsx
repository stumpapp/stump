import { formatBytes } from '@stump/client'
import { useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import medium from 'expo-symbols/androidWeights/medium'
import { CheckCircle2, Trash } from 'lucide-react-native'
import { useCallback, useEffect, useMemo } from 'react'
import { Alert, Platform, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import { epubProgress, imageMeta, syncStatus } from '~/db'
import { usePalette } from '~/lib/constants'
import { useDownload, useTranslate } from '~/lib/hooks'
import { useSelectionStore } from '~/stores/selection'

import { ThumbnailImage } from '../image'
import { Heading, Progress, Text } from '../ui'
import { ContextMenu } from '../ui/context-menu/context-menu'
import { SyncIcon } from './sync-icon/SyncIcon'
import { DownloadedFile } from './types'
import { useDownloadRowItemSize } from './useDownloadRowItemSize'
import { getThumbnailPath } from './utils'

type Props = {
	downloadedFile: DownloadedFile
}

export default function DownloadRowItem({ downloadedFile }: Props) {
	const router = useRouter()

	const { t } = useTranslate()

	const { deleteBook } = useDownload({
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

	const { width, height } = useDownloadRowItemSize()
	const { backgroundColor, iconColor } = usePalette({
		iconColor: { light: 400, dark: 700 },
		backgroundColor: { light: 150, dark: 950, chromaScale: 0.6 },
	})

	const selectionStore = useSelectionStore(
		useShallow((state) => ({
			isSelectionMode: state.isSelecting,
			setIsSelecting: state.setIsSelecting,
			toggleSelection: state.toggleSelection,
			isSelected: state.isSelected(downloadedFile.id),
		})),
	)

	const onSelectItem = useCallback(
		(id: string) => selectionStore.toggleSelection(id),
		[selectionStore],
	)

	const scale = useSharedValue(1)
	const opacity = useSharedValue(1)
	const bgOpacity = useSharedValue(0)
	const bgScale = useSharedValue(0)

	useEffect(() => {
		// three different modes (selected, not selected, and not in selection mode)
		if (selectionStore.isSelectionMode) {
			if (selectionStore.isSelected) {
				scale.value = withTiming(0.95, { duration: 250 })
				opacity.value = withTiming(1, { duration: 250 })
				bgOpacity.value = withTiming(1, { duration: 250 })
				bgScale.value = withTiming(1, { duration: 250 })
			} else {
				scale.value = withTiming(0.9, { duration: 250 })
				opacity.value = withTiming(0.5, { duration: 250 })
				bgOpacity.value = withTiming(0, { duration: 250 })
				bgScale.value = withTiming(0.85, { duration: 250 })
			}
		} else {
			scale.value = withTiming(1, { duration: 250 })
			opacity.value = withTiming(1, { duration: 250 })
			bgOpacity.value = withTiming(0, { duration: 250 })
			bgScale.value = withTiming(1, { duration: 250 })
		}
	}, [selectionStore, scale, opacity, bgOpacity, bgScale])

	const itemStyle = useAnimatedStyle(() => {
		return {
			transform: [{ scale: scale.value }],
			opacity: opacity.value,
		}
	})

	const backgroundStyle = useAnimatedStyle(() => {
		return {
			opacity: bgOpacity.value,
			transform: [{ scale: bgScale.value }],
		}
	})

	const overlayStyle = useAnimatedStyle(() => {
		return {
			opacity: bgOpacity.value,
			transform: [{ scale: bgScale.value }],
		}
	})

	const onPress = useCallback(
		() =>
			selectionStore.isSelectionMode
				? onSelectItem(downloadedFile.id)
				: router.navigate(`/offline/${downloadedFile.id}`),
		[router, downloadedFile.id, selectionStore, onSelectItem],
	)

	const handleSelect = useCallback(() => {
		selectionStore.setIsSelecting(true)
		onSelectItem(downloadedFile.id)
	}, [selectionStore, downloadedFile.id, onSelectItem])

	const handleDelete = useCallback(() => {
		Alert.alert(
			t('bookActions.deleteBook.label'),
			t('bookActions.deleteBook.confirmation', {
				bookTitle: downloadedFile.bookName ? `'${downloadedFile.bookName}'` : t('common.thisBook'),
			}),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.delete'),
					style: 'destructive',
					onPress: () => deleteBook(downloadedFile.id),
				},
			],
		)
	}, [deleteBook, downloadedFile.id, downloadedFile.bookName, t])

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
								label: t('common.select'),
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
							{
								label: t('bookActions.deleteBook.label'),
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
				<Animated.View
					className="squircle left-3 right-3 -top-1 -bottom-1 absolute rounded-3xl"
					style={[backgroundStyle, { backgroundColor: backgroundColor }]}
				/>

				<Animated.View className="mx-4 gap-4 relative flex-row" style={[{ height }, itemStyle]}>
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

					<View className="gap-2 py-1.5 flex-1 justify-center">
						<View className="gap-2 flex-row justify-between">
							<Heading numberOfLines={2} className="shrink">
								{downloadedFile.bookName || t('common.unknownTitle')}
							</Heading>

							{status && (
								<Animated.View className="mt-1 shrink-0">
									<SyncIcon status={status} />
								</Animated.View>
							)}
						</View>

						<View className="gap-2 flex-row items-center">
							{currentPage && (
								<View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
									<Text size="sm">{`${t('common.page')} ${currentPage}`}</Text>
									<Text
										size="xs"
										className="pb-0.5 text-foreground-muted"
									>{` / ${totalPages}`}</Text>
								</View>
							)}

							{size && (
								<View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 rounded-full">
									<Text size="sm" className="text-foreground-muted">
										{size}
									</Text>
								</View>
							)}
						</View>

						{readProgress && (
							<View className="gap-3 flex-row items-center">
								<Progress
									className="shrink"
									trackClassName="bg-black/5 dark:bg-white/10"
									value={getProgress()}
									style={{ height: 6, borderRadius: 3 }}
								/>

								<Text size="sm" className="text-foreground-muted shrink-0">
									{(getProgress() || 0).toFixed(0)}%
								</Text>
							</View>
						)}
					</View>
				</Animated.View>

				<Animated.View
					// absolute and symmetrical so it translates from the same origin as the background style, plus move the icon up and left
					className="left-2 right-2 -top-2.5 -bottom-2.5 absolute"
					style={overlayStyle}
				>
					<CheckIcon color={iconColor} />
				</Animated.View>
			</ContextMenu>
		</>
	)
}

function CheckIcon({ color }: { color: string }) {
	return Platform.select({
		ios: (
			<SymbolView
				name="checkmark.circle.fill"
				weight="medium"
				size={30}
				type="palette"
				colors={['white', color]}
			/>
		),
		android: (
			<View
				className="squircle h-7 w-7 items-center justify-center rounded-full"
				style={{ backgroundColor: color }}
			>
				<SymbolView
					name={{ android: 'check' }}
					// @ts-expect-error ios should not be required
					weight={{ android: medium }}
					size={18}
					tintColor={'white'}
					// this makes it line up with ios, because the ios icon has some kind of padding, because of course it does
					style={{ inset: 3 }}
				/>
			</View>
		),
	})
}
