import { Slider } from '@miblanchard/react-native-slider'
import { useSDK } from '@stump/client'
import { ReadingDirection } from '@stump/graphql'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { Image as EImage } from 'expo-image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, View } from 'react-native'
import { FlatList, Pressable } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FasterImage } from '~/components/Image'
import { Progress, Text } from '~/components/ui'
import { useDisplay, usePrevious } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { useReaderStore } from '~/stores'
import { useBookPreferences, useBookReadTime } from '~/stores/reader'

import { useImageBasedReader } from './context'

dayjs.extend(duration)

const HEIGHT_MODIFIER = 2 / 3
const WIDTH_MODIFIER = 2 / 3

export default function Footer() {
	const { sdk } = useSDK()
	const { isTablet, height, width } = useDisplay()
	const {
		book,
		pageURL,
		pageThumbnailURL,
		currentPage = 1,
		pageSets,
		flatListRef: readerRef,
		imageSizes,
		setImageSizes,
	} = useImageBasedReader()
	const elapsedSeconds = useBookReadTime(book.id)
	const {
		preferences: { footerControls = 'slider', trackElapsedTime, readingDirection },
	} = useBookPreferences({ book })

	const galleryRef = useRef<FlatList>(null)
	const insets = useSafeAreaInsets()

	const visible = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)

	const [isSliderDragging, setIsSliderDragging] = useState(false)

	const translateY = useSharedValue(height / 2)
	useEffect(() => {
		translateY.value = withTiming(visible ? 0 : height / 2)
	}, [visible, translateY, height])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			left: insets.left,
			right: insets.right,
			bottom: insets.bottom,
			transform: [{ translateY: translateY.value }],
		}
	})

	const percentage = (currentPage / book.pages) * 100

	const baseSize = useMemo(() => {
		const baseWidth = isTablet ? 120 : 75
		return {
			height: baseWidth / HEIGHT_MODIFIER,
			width: baseWidth,
		}
	}, [isTablet])

	const calcSetContainerSize = useCallback(
		(set: number[]) => {
			const isDoubleSpread = set.length === 2
			const isLandscape = set.some((page) => (imageSizes?.[page]?.ratio || 0) >= 1)

			let containerSize = baseSize
			if (isLandscape) {
				containerSize = {
					height: containerSize.width,
					width: containerSize.height,
				}
			}

			if (isDoubleSpread) {
				containerSize = {
					height: containerSize.height,
					width: containerSize.width * 2,
				}
			}

			if (set.includes(currentPage - 1)) {
				containerSize = {
					height: containerSize.height / HEIGHT_MODIFIER,
					width: containerSize.width / WIDTH_MODIFIER,
				}
			}

			return containerSize
		},
		[currentPage, baseSize, imageSizes],
	)

	const getGalleryItemSize = useCallback(
		(idx: number) => {
			const set = pageSets[idx]
			const containerSize = calcSetContainerSize(set)
			return containerSize
		},
		[pageSets, calcSetContainerSize],
	)

	const getItemLayout = useCallback(
		(_: ArrayLike<number[]> | null | undefined, index: number) => {
			const totalOffset = pageSets
				.slice(0, index)
				.reduce((acc, set) => acc + calcSetContainerSize(set).width, 0)

			return {
				length: getGalleryItemSize(index).width,
				offset: totalOffset,
				index,
			}
		},
		[getGalleryItemSize, pageSets, calcSetContainerSize],
	)

	const onChangePage = useCallback(
		(idx: number) => {
			if (idx < 0 || idx >= pageSets.length) return
			setShowControls(false)
			readerRef.current?.scrollToIndex({ index: idx, animated: false })
		},
		[readerRef, setShowControls, pageSets.length],
	)

	const visibilityChanged = usePrevious(visible) !== visible
	useEffect(() => {
		if (footerControls !== 'images') return

		if (visible && visibilityChanged) {
			const idx = pageSets.findIndex((set) => set.includes(currentPage - 1))
			if (idx === -1) return
			galleryRef.current?.scrollToIndex({
				index: idx,
				animated: false,
				viewPosition: 0.5,
			})
		}
	}, [footerControls, currentPage, visible, visibilityChanged, pageSets])

	const formatDuration = useCallback(() => {
		if (elapsedSeconds <= 60) {
			return `${elapsedSeconds} seconds`
		} else if (elapsedSeconds <= 3600) {
			return dayjs.duration(elapsedSeconds, 'seconds').format('m [minutes] s [seconds]')
		} else {
			return dayjs
				.duration(elapsedSeconds, 'seconds')
				.format(`H [hour${elapsedSeconds >= 7200 ? 's' : ''}] m [minutes]`)
		}
	}, [elapsedSeconds])

	const pageSource = useCallback(
		(page: number) => ({
			uri: pageThumbnailURL ? pageThumbnailURL(page) : pageURL(page),
			headers: {
				Authorization: sdk.authorizationHeader,
			},
		}),
		[pageURL, pageThumbnailURL, sdk],
	)

	const onImageLoaded = useCallback(
		(idx: number, { height, width }: { height: number; width: number }) => {
			const existingSize = imageSizes?.[idx]
			const isDifferent = existingSize?.height !== height || existingSize?.width !== width
			if (!isDifferent) return
			setImageSizes((prev) => ({
				...prev,
				[idx]: {
					height,
					width,
					ratio: width / height,
				},
			}))
		},
		[imageSizes, setImageSizes],
	)

	// TODO: prefetch, see https://github.com/candlefinance/faster-image/issues/73
	useEffect(
		() => {
			if (footerControls !== 'images') return

			const windowSize = isTablet ? 8 : 6

			const actualPage =
				readingDirection === ReadingDirection.Rtl ? book.pages - currentPage : currentPage

			const start = Math.max(0, actualPage - windowSize)
			const end = Math.min(book.pages, actualPage + windowSize)
			const urls = Array.from({ length: end - start }, (_, i) =>
				pageThumbnailURL ? pageThumbnailURL(i + start) : pageURL(i + start),
			)
			EImage.prefetch(urls, {
				headers: {
					Authorization: sdk.authorizationHeader || '',
				},
				cachePolicy: 'disk',
			})
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentPage, readingDirection],
	)

	const [sliderValue, setSliderValue] = useState(currentPage - 1)

	const handleSlideValueChange = useCallback(
		(idx: number) => {
			if (footerControls !== 'slider') return

			const currentIdx = currentPage - 1
			if (idx < 0 || idx >= book.pages) return
			if (idx === currentIdx) return
			setSliderValue(idx)
		},
		[currentPage, book.pages, footerControls],
	)

	const getSliderImageContainerStyles = useCallback(
		(value: number, pageSet: number[]) => {
			const isLandscape = (imageSizes?.[value - 1]?.ratio || 0) >= 1

			let containerSize = baseSize

			if (isLandscape) {
				containerSize = {
					height: containerSize.width,
					width: containerSize.height,
				}
			}

			if (pageSet.length === 2) {
				containerSize = {
					height: containerSize.height,
					width: containerSize.width * 2,
				}
			}

			const approxStepSize = width / pageSets.length
			const approximatePosition = value * approxStepSize
			const translateY = isTablet ? -20 : -10

			// If we aren't close to an edge, we can just divide containerWidth by 2
			// If we are close to an edge, we need to offset the translation
			let translateX = (containerSize.width / 2) * -1
			if (approximatePosition < containerSize.width / 2) {
				translateX = -approximatePosition
			} else if (approximatePosition > width - containerSize.width / 2) {
				translateX = (containerSize.width - (width - approximatePosition)) * -1
			}

			return {
				translateX,
				translateY,
				containerSize,
			}
		},
		[isTablet, width, pageSets, imageSizes, baseSize],
	)

	const renderAboveThumbComponent = useCallback(
		(_: number, value: number) => {
			if (value < 0 || value >= book.pages) return null
			if (!visible) return null
			if (!isSliderDragging) return null

			const pageSet = pageSets.find((set) => set.includes(value - 1)) || []

			const { translateX, translateY, containerSize } = getSliderImageContainerStyles(
				value,
				pageSet,
			)

			return (
				<View
					style={[
						{
							transform: [
								{ translateX },
								{
									translateY,
								},
							],
						},
					]}
				>
					<View
						className="flex flex-row"
						style={{
							height: containerSize.height,
							width: containerSize.width,
							gap: 1,
						}}
					>
						{pageSet.map((pageIdx, i) => {
							const source = pageSource(pageIdx + 1)
							return (
								<FasterImage
									key={`thumb-${pageIdx + 1}-${i}`}
									source={{
										url: source.uri,
										headers: source.headers as Record<string, string>,
										resizeMode: 'fill',
										borderRadius: 8,
									}}
									style={{
										width: pageSet.length === 1 ? '100%' : '50%',
										height: '100%',
									}}
									onSuccess={({ nativeEvent }) => onImageLoaded(pageIdx, nativeEvent)}
								/>
							)
						})}
					</View>

					<Text className="text-center">{pageSet.map((i) => i + 1).join('-')}</Text>
				</View>
			)
		},
		[
			book.pages,
			isSliderDragging,
			pageSource,
			getSliderImageContainerStyles,
			visible,
			pageSets,
			onImageLoaded,
		],
	)

	const onSlidingComplete = useCallback(
		(page: number) => {
			setIsSliderDragging(false)
			if (footerControls !== 'slider') return
			const resolvedPage =
				(readingDirection === ReadingDirection.Rtl ? book.pages - page : page) - 1
			const idx = pageSets.findIndex((set) => set.includes(resolvedPage))
			if (idx === -1) return
			onChangePage(idx)
		},
		[onChangePage, book.pages, readingDirection, footerControls, pageSets],
	)

	useEffect(() => {
		if (visible) {
			const actualPage =
				readingDirection === ReadingDirection.Rtl ? book.pages - currentPage : currentPage
			setSliderValue(actualPage)
		}
	}, [book.pages, visible, readingDirection, currentPage])

	const previousReadingDirection = usePrevious(readingDirection)
	/**
	 * An effect to update the slider value when the reading direction changes. The slider
	 * doesn't support an inverted mode, so we manually invert the numbers
	 */
	useEffect(() => {
		if (previousReadingDirection === readingDirection) return

		if (footerControls === 'slider') {
			const newValue =
				readingDirection === ReadingDirection.Rtl ? book.pages - currentPage : currentPage
			setSliderValue(newValue)
		}
	}, [currentPage, book.pages, readingDirection, previousReadingDirection, footerControls])

	// Note: The minimum and maximum track styles are inverted based on the reading direction, as
	// to give the appearance of either ltr or rtl (minimum track is ltr, maximum track is rtl)
	const minimumTrackStyle = useMemo(
		() =>
			readingDirection === ReadingDirection.Ltr ? { backgroundColor: 'rgb(196, 130, 89)' } : {},
		[readingDirection],
	)
	const maximumTrackStyle = useMemo(
		() =>
			readingDirection === ReadingDirection.Rtl ? { backgroundColor: 'rgb(196, 130, 89)' } : {},
		[readingDirection],
	)

	const renderGalleryItem = useCallback(
		({ item, index }: { item: number[]; index: number }) => {
			const isCurrentPage = item.includes(currentPage - 1)
			const isLandscape = item.some((page) => (imageSizes?.[page]?.ratio || 0) >= 1)

			const transform =
				isLandscape && isCurrentPage
					? [
							{
								// Text size
								translateY: isTablet ? -20 : -18,
							},
						]
					: undefined

			return (
				<Pressable onPress={() => onChangePage(index)}>
					<View
						className={cn('flex flex-row', {
							'pl-1': index === 0,
							'pr-1': index === book.pages - 1,
						})}
						style={{
							...getGalleryItemSize(index),
							gap: 1,
							transform,
						}}
					>
						{item.map((pageIdx, i) => {
							return (
								<FasterImage
									key={`thumb-${pageIdx + 1}-${i}`}
									source={{
										url: pageSource(pageIdx + 1).uri,
										headers: pageSource(pageIdx + 1).headers as Record<string, string>,
										resizeMode: 'fill',
										borderRadius: 8,
									}}
									style={{
										width: item.length === 1 ? '100%' : '50%',
										height: '100%',
									}}
									onSuccess={({ nativeEvent }) => onImageLoaded(pageIdx, nativeEvent)}
								/>
							)
						})}
					</View>

					{!isCurrentPage && (
						<Text size="sm" className="shrink-0 text-center text-[#898d94]">
							{item.map((i) => i + 1).join('-')}
						</Text>
					)}
				</Pressable>
			)
		},
		[
			onChangePage,
			currentPage,
			book.pages,
			pageSource,
			getGalleryItemSize,
			onImageLoaded,
			isTablet,
			imageSizes,
		],
	)

	// TODO: swap to flashlist, does NOT like dynamic height though...
	return (
		<Animated.View className="absolute z-20 shrink gap-4 px-1" style={animatedStyles}>
			{footerControls === 'images' && (
				<FlatList
					ref={galleryRef}
					data={pageSets}
					inverted={readingDirection === ReadingDirection.Rtl}
					keyExtractor={(item) => `gallery-${item.join('-')}`}
					renderItem={renderGalleryItem}
					contentContainerStyle={{ gap: 6, alignItems: 'flex-end' }}
					getItemLayout={getItemLayout}
					horizontal
					showsHorizontalScrollIndicator={false}
					windowSize={5}
					initialNumToRender={isTablet ? 8 : 6}
					maxToRenderPerBatch={isTablet ? 8 : 6}
				/>
			)}

			<View className={cn('gap-2 px-1', { 'pb-1': Platform.OS === 'android' })}>
				{footerControls === 'images' && (
					<Progress
						className="h-1 bg-[#898d94]"
						indicatorClassName="bg-[#f5f3ef]"
						value={percentage}
						inverted={readingDirection === ReadingDirection.Rtl}
						max={100}
					/>
				)}

				{footerControls === 'slider' && (
					<Slider
						maximumValue={pageSets.length - 1}
						step={1}
						value={sliderValue}
						trackStyle={{
							height: 12,
							borderRadius: 6,
							backgroundColor: '#898d9490',
						}}
						minimumTrackStyle={minimumTrackStyle}
						maximumTrackStyle={maximumTrackStyle}
						thumbStyle={{ width: 24, height: 24, backgroundColor: 'white', borderRadius: 999 }}
						onValueChange={([page]) => handleSlideValueChange(page)}
						animationType="timing"
						renderAboveThumbComponent={renderAboveThumbComponent}
						onSlidingComplete={([page]) => onSlidingComplete(page)}
						onSlidingStart={() => setIsSliderDragging(true)}
					/>
				)}

				<View
					className={cn('flex flex-row justify-between', { 'justify-around': !trackElapsedTime })}
				>
					{trackElapsedTime && (
						<View>
							<Text className="text-sm text-[#898d94]">Reading time: {formatDuration()}</Text>
						</View>
					)}

					<View>
						<Text className="text-sm text-[#898d94]">
							Page {currentPage} of {book.pages}
						</Text>
					</View>
				</View>
			</View>
		</Animated.View>
	)
}
