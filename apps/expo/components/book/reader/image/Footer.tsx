import { Slider } from '@miblanchard/react-native-slider'
import { useSDK } from '@stump/client'
import { ReadingDirection } from '@stump/graphql'
import { STUMP_SAVE_BASIC_SESSION_HEADER } from '@stump/sdk/constants'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, View } from 'react-native'
import { FlatList, Pressable } from 'react-native-gesture-handler'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'

import { TurboImage } from '~/components/Image'
import { Progress, Text } from '~/components/ui'
import { useDisplay, usePrevious } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { useBookPreferences, useBookReadTime } from '~/stores/reader'

import { useImageBasedReader } from './context'

dayjs.extend(duration)

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
		isOPDS,
	} = useImageBasedReader()
	const elapsedSeconds = useBookReadTime(book.id)
	const {
		preferences: { footerControls = 'slider', trackElapsedTime, readingDirection },
	} = useBookPreferences({ book })

	const galleryRef = useRef<FlatList>(null)
	const insets = useSafeAreaInsets()

	const visible = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const [isSliderDragging, setIsSliderDragging] = useState(false)

	const baseSize = useMemo(() => {
		const baseWidth = isTablet ? 120 : 75
		return {
			height: baseWidth / thumbnailRatio,
			width: baseWidth,
		}
	}, [isTablet, thumbnailRatio])

	const largestHeight = baseSize.height / thumbnailRatio
	const translateY = useSharedValue(largestHeight * 2)
	useEffect(() => {
		translateY.value = withTiming(visible ? 0 : largestHeight * 1.8, {
			duration: 250,
			easing: visible ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
		})
	}, [visible])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			left: insets.left,
			right: insets.right,
			bottom: insets.bottom,
			transform: [{ translateY: translateY.value }],
		}
	})

	const percentage = (currentPage / book.pages) * 100

	const calcSetContainerSize = useCallback(
		(set: number[]) => {
			const isDoubleSpread = set.length === 2
			const isLandscape = set.some((page) => (imageSizes?.[page]?.ratio || 0) >= 1)

			let containerSize = baseSize

			if (isDoubleSpread || isLandscape) {
				containerSize = {
					height: containerSize.height,
					width: containerSize.width * 2,
				}
			}

			// Make the current page set's images larger by 1.5 times
			if (set.includes(currentPage - 1)) {
				containerSize = {
					height: containerSize.height * 1.5,
					width: containerSize.width * 1.5,
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
			const totalOffset =
				8 +
				pageSets.slice(0, index).reduce(
					(acc, set) =>
						acc +
						6 + // add gap between pages
						calcSetContainerSize(set).width,
					0,
				)

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
		const duration = dayjs.duration(elapsedSeconds, 'seconds')
		const hours = Math.trunc(duration.asHours())
		const minutes = duration.minutes()
		const seconds = duration.seconds()

		if (elapsedSeconds <= 59) {
			return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
		}
		if (elapsedSeconds <= 3599) {
			return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
		}
		return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
	}, [elapsedSeconds])

	const pageSource = useCallback(
		(page: number) => ({
			uri: pageThumbnailURL ? pageThumbnailURL(page) : pageURL(page),
			headers: {
				Authorization: sdk.authorizationHeader,
				[STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
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

	useEffect(
		() => {
			if (footerControls !== 'images' || isOPDS) return

			const windowSize = isTablet ? 8 : 6

			const actualPage =
				readingDirection === ReadingDirection.Rtl ? book.pages - currentPage : currentPage

			const start = Math.max(0, actualPage - windowSize)
			const end = Math.min(book.pages, actualPage + windowSize)
			const urls = Array.from({ length: end - start }, (_, i) =>
				pageThumbnailURL ? pageThumbnailURL(i + start) : pageURL(i + start),
			)
			// TODO: Test if turbo image crashes when in OPDS (it previously did with expo image)
			TImage.prefetch(
				urls.map((url) => ({
					uri: url,
					headers: {
						...sdk.customHeaders,
						Authorization: sdk.authorizationHeader || '',
						[STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
					},
				})),
				'dataCache',
			)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentPage, readingDirection, isOPDS],
	)

	/**
	 * A function that takes the slider value and returns the corresponding pageSet index
	 */
	const getPageSetIndex = useCallback(
		(value: number) => {
			if (readingDirection === ReadingDirection.Rtl) {
				return pageSets.length - 1 - value
			} else return value
		},
		[pageSets.length, readingDirection],
	)

	/**
	 * A function that takes the pageSet index and returns the corresponding slider value
	 * It uses the same logic as getPageSetIndex
	 */
	const getSliderValue = useCallback((idx: number) => getPageSetIndex(idx), [getPageSetIndex])

	const currentIdx = pageSets.findIndex((set) => set.includes(currentPage - 1))
	const [sliderValue, setSliderValue] = useState(() => getSliderValue(currentIdx))

	const handleSlideValueChange = useCallback(
		(value: number) => {
			if (footerControls !== 'slider') return

			if (value < 0 || value >= pageSets.length) return

			const currentIdx = pageSets.findIndex((set) => set.includes(currentPage - 1))
			const currentValue = getPageSetIndex(currentIdx)
			if (value === currentValue) return

			setSliderValue(value)
		},
		[currentPage, pageSets.length, footerControls],
	)

	const getSliderImageContainerStyles = useCallback(
		(value: number, pageSet: number[]) => {
			const isLandscape = (imageSizes?.[pageSet[0]]?.ratio || 0) >= 1

			let containerSize = baseSize

			if (pageSet.length === 2 || isLandscape) {
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
			if (value < 0 || value >= pageSets.length) return null
			if (!visible) return null
			if (!isSliderDragging) return null

			const pageSetIndex = getPageSetIndex(value)
			const pageSet = pageSets[pageSetIndex] || []

			const { translateX, translateY, containerSize } = getSliderImageContainerStyles(
				value,
				pageSet,
			)

			const directionRespectingPageSet =
				readingDirection === ReadingDirection.Rtl ? [...pageSet].reverse() : pageSet

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
						{directionRespectingPageSet.map((pageIdx, i) => {
							const source = pageSource(pageIdx + 1)
							return (
								<TurboImage
									key={`thumb-${pageIdx + 1}-${i}`}
									source={{
										uri: source.uri,
										headers: source.headers as Record<string, string>,
									}}
									resizeMode="stretch"
									resize={containerSize.width * 1.5}
									style={{
										width: pageSet.length === 1 ? '100%' : '50%',
										height: '100%',
										borderRadius: 6,
										// @ts-expect-error bug in library (to be fixed soon). StyleProp<ImageStyle> should be StyleProp<ViewStyle>
										borderCurve: 'continuous',
										overflow: 'hidden',
									}}
									onSuccess={({ nativeEvent }) => onImageLoaded(pageIdx, nativeEvent)}
								/>
							)
						})}
					</View>

					<Text className="text-center">
						{pageSet
							.sort((a, b) => a - b) // we always use (from left to right) the smaller then larger number even if using RTL (e.g. pages 3-4 and never 4-3)
							.map((i) => i + 1)
							.join('-')}
					</Text>
				</View>
			)
		},
		[
			isSliderDragging,
			pageSource,
			getSliderImageContainerStyles,
			visible,
			pageSets,
			onImageLoaded,
			readingDirection,
		],
	)

	const onSlidingComplete = useCallback(
		(value: number) => {
			setIsSliderDragging(false)
			if (footerControls !== 'slider') return
			if (value < 0 || value >= pageSets.length) return

			const pageSetIdx = getPageSetIndex(value)
			onChangePage(pageSetIdx)
		},
		[onChangePage, pageSets.length, readingDirection, footerControls, pageSets],
	)

	const previousReadingDirection = usePrevious(readingDirection)
	/**
	 * An effect to update the slider value when either:
	 * 1. The reading direction changes
	 * 2. The controls overlay is opened
	 */
	useEffect(() => {
		if (footerControls !== 'slider') return
		if (visible || previousReadingDirection !== readingDirection) {
			const currentSetIndex = pageSets.findIndex((set) => set.includes(currentPage - 1))
			setSliderValue(getSliderValue(currentSetIndex))
		}
	}, [
		visible,
		currentPage,
		pageSets.length,
		readingDirection,
		previousReadingDirection,
		footerControls,
		getSliderValue,
	])

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
			if (!item || !item.length) return null

			const isCurrentPage = item.includes(currentPage - 1)

			const directionRespectingItem =
				readingDirection === ReadingDirection.Rtl ? [...item].reverse() : item

			return (
				<Pressable onPress={() => onChangePage(index)}>
					<View
						className="flex flex-row"
						style={{
							...getGalleryItemSize(index),
							borderCurve: 'continuous',
							overflow: 'hidden',
							borderRadius: 6,
						}}
					>
						{directionRespectingItem.map((pageIdx, i) => {
							return (
								<TurboImage
									key={`thumb-${pageIdx + 1}-${i}`}
									source={{
										uri: pageSource(pageIdx + 1).uri,
										headers: pageSource(pageIdx + 1).headers as Record<string, string>,
									}}
									resizeMode="stretch"
									// we downscale (resize) by width, so when we resize an individual image, the gallery size is halved when the item length is 2.
									resize={(getGalleryItemSize(index).width / item.length) * 1.5}
									style={{ width: item.length === 1 ? '100%' : '50%', height: '100%' }}
									onSuccess={({ nativeEvent }) => onImageLoaded(pageIdx, nativeEvent)}
								/>
							)
						})}
					</View>

					{!isCurrentPage && (
						<Text size="sm" className="shrink-0 text-center text-[#898d94]">
							{item
								.sort((a, b) => a - b) // we always use (from left to right) the smaller then larger number even if using RTL (e.g. pages 3-4 and never 4-3)
								.map((i) => i + 1)
								.join('-')}
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
		<Animated.View className="absolute z-20 shrink gap-4" style={animatedStyles}>
			{footerControls === 'images' && (
				<FlatList
					ref={galleryRef}
					data={pageSets ?? []}
					inverted={readingDirection === ReadingDirection.Rtl}
					keyExtractor={(item) => `gallery-${item?.join('-')}`}
					renderItem={renderGalleryItem}
					contentContainerStyle={{ gap: 6, alignItems: 'flex-end', paddingHorizontal: 8 }}
					getItemLayout={getItemLayout}
					horizontal
					showsHorizontalScrollIndicator={false}
					windowSize={5}
					initialNumToRender={isTablet ? 8 : 6}
					maxToRenderPerBatch={isTablet ? 8 : 6}
				/>
			)}

			<View className={cn('gap-2 px-3', { 'pb-1': Platform.OS === 'android' })}>
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
							borderCurve: 'continuous',
							backgroundColor: '#898d9490',
						}}
						minimumTrackStyle={minimumTrackStyle}
						maximumTrackStyle={maximumTrackStyle}
						thumbStyle={{ width: 24, height: 24, backgroundColor: 'white', borderRadius: 999 }}
						onValueChange={([value]) => handleSlideValueChange(value)}
						animationType="timing"
						renderAboveThumbComponent={renderAboveThumbComponent}
						onSlidingComplete={([value]) => onSlidingComplete(value)}
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
