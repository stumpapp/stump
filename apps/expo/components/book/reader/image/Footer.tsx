import { Slider } from '@miblanchard/react-native-slider'
import { useSDK } from '@stump/client'
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

// TODO: account for image ratio when rendering in gallery
// TODO: double spread when double spread is enabled and gallery is visible

export default function Footer() {
	const { sdk } = useSDK()
	const { isTablet, height, width } = useDisplay()
	const {
		book: { pages, id },
		pageURL,
		pageThumbnailURL,
		currentPage = 1,
		flatListRef: readerRef,
	} = useImageBasedReader()
	const elapsedSeconds = useBookReadTime(id)
	const {
		preferences: { footerControls, trackElapsedTime, readingDirection },
	} = useBookPreferences(id)
	// const globalCachePolicy = usePreferencesStore((state) => state.cachePolicy)

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

	const percentage = (currentPage / pages) * 100

	const baseSize = useMemo(
		() => ({
			width: isTablet ? 100 : 75,
			height: isTablet ? 150 : 100,
		}),
		[isTablet],
	)
	const getSize = useCallback(
		(idx: number) => ({
			width: idx === currentPage - 1 ? baseSize.width / WIDTH_MODIFIER : baseSize.width,
			height: idx === currentPage - 1 ? baseSize.height / HEIGHT_MODIFIER : baseSize.height,
		}),
		[currentPage, baseSize],
	)

	const getItemLayout = useCallback(
		(_: ArrayLike<number> | null | undefined, index: number) => {
			const isAtOrAfterCurrentPage = index >= currentPage - 1
			if (isAtOrAfterCurrentPage) {
				// TODO: my math is actually comically bad and this needs adjustment
				// Up until the current page each item is the baseSize, then we have ONE larger item
				// which is the current page, and the rest are baseSize.
				const baseOffset = baseSize.width * index + 2 * index
				return {
					length: getSize(index).width,
					offset: baseOffset + baseSize.width / WIDTH_MODIFIER,
					index,
				}
			}

			// Before the current page, all items are the baseSize
			return {
				length: getSize(index).width,
				offset: getSize(index).width * index + 4 * index,
				index,
			}
		},
		[getSize, currentPage, baseSize],
	)

	const onChangePage = useCallback(
		(idx: number) => {
			if (idx < 0 || idx >= pages) return
			setShowControls(false)
			readerRef.current?.scrollToIndex({ index: idx, animated: false })
		},
		[readerRef, setShowControls, pages],
	)

	const visibilityChanged = usePrevious(visible) !== visible
	useEffect(() => {
		if (footerControls !== 'images') return

		if (visible && visibilityChanged) {
			galleryRef.current?.scrollToIndex({
				index: currentPage > 0 ? currentPage - 1 : 0,
				animated: false,
				viewPosition: 0.5,
			})
		}
	}, [footerControls, currentPage, visible, visibilityChanged])

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

	// TODO: prefetch, see https://github.com/candlefinance/faster-image/issues/73
	useEffect(
		() => {
			if (footerControls !== 'images') return

			const windowSize = isTablet ? 8 : 6

			const actualPage = readingDirection === 'rtl' ? pages - currentPage : currentPage

			const start = Math.max(0, actualPage - windowSize)
			const end = Math.min(pages, actualPage + windowSize)
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
			if (idx < 0 || idx >= pages) return
			if (idx === currentIdx) return
			setSliderValue(idx)
		},
		[currentPage, pages, footerControls],
	)

	const getSliderThumbTranslations = useCallback(
		(value: number) => {
			const containerWidth = isTablet ? 200 : 150
			const approxStepSize = width / pages
			const approximatePosition = value * approxStepSize
			const translateY = isTablet ? -20 : -10

			// If we aren't close to an edge, we can just divide containerWidth by 2
			// If we are close to an edge, we need to offset the translation
			let translateX = (containerWidth / 2) * -1
			if (approximatePosition < containerWidth / 2) {
				translateX = -approximatePosition
			} else if (approximatePosition > width - containerWidth / 2) {
				translateX = (containerWidth - (width - approximatePosition)) * -1
			}

			return {
				translateX,
				translateY,
			}
		},
		[isTablet, width, pages],
	)

	const renderAboveThumbComponent = useCallback(
		(_: number, value: number) => {
			if (value < 0 || value >= pages) return null
			if (!visible) return null

			const actualPage = readingDirection === 'rtl' ? pages - value : value
			if (actualPage === currentPage && !isSliderDragging) return null

			const containerSize = {
				height: isTablet ? 300 : 200,
				width: isTablet ? 200 : 150,
			}

			const { translateX, translateY } = getSliderThumbTranslations(value)

			return (
				<View
					style={{
						...containerSize,
						transform: [
							{ translateX },
							{
								translateY,
							},
						],
					}}
				>
					<View
						className="overflow-hidden rounded-lg"
						style={{
							height: '100%',
							width: '100%',
						}}
					>
						{/* <Image
							source={pageSource(actualPage)}
							cachePolicy="memory"
							style={{
								width: '100%',
								height: '100%',
							}}
							contentFit="fill"
						/> */}

						<FasterImage
							source={{
								url: pageSource(actualPage).uri,
								headers: pageSource(actualPage).headers as Record<string, string>,
								resizeMode: 'fill',
							}}
							style={{
								width: '100%',
								height: '100%',
							}}
						/>
					</View>

					<Text className="text-center">{actualPage}</Text>
				</View>
			)
		},
		[
			currentPage,
			pages,
			readingDirection,
			isTablet,
			isSliderDragging,
			pageSource,
			getSliderThumbTranslations,
			visible,
		],
	)

	const onSlidingComplete = useCallback(
		(page: number) => {
			setIsSliderDragging(false)
			if (footerControls !== 'slider') return
			const idx = (readingDirection === 'rtl' ? pages - page : page) - 1
			onChangePage(idx)
		},
		[onChangePage, pages, readingDirection, footerControls],
	)

	useEffect(
		() => {
			if (visible) {
				const actualPage = readingDirection === 'rtl' ? pages - currentPage : currentPage
				setSliderValue(actualPage)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[visible, readingDirection],
	)

	const previousReadingDirection = usePrevious(readingDirection)
	/**
	 * An effect to update the slider value when the reading direction changes. The slider
	 * doesn't support an inverted mode, so we manually invert the numbers
	 */
	useEffect(() => {
		if (previousReadingDirection === readingDirection) return

		if (footerControls === 'slider') {
			const newValue = readingDirection === 'rtl' ? pages - currentPage : currentPage
			setSliderValue(newValue)
		}
	}, [currentPage, pages, readingDirection, previousReadingDirection, footerControls])

	// Note: The minimum and maximum track styles are inverted based on the reading direction, as
	// to give the appearance of either ltr or rtl (minimum track is ltr, maximum track is rtl)
	const minimumTrackStyle = useMemo(
		() => (readingDirection === 'ltr' ? { backgroundColor: 'rgb(196, 130, 89)' } : {}),
		[readingDirection],
	)
	const maximumTrackStyle = useMemo(
		() => (readingDirection === 'rtl' ? { backgroundColor: 'rgb(196, 130, 89)' } : {}),
		[readingDirection],
	)

	// TODO: swap to flashlist, does NOT like dynamic height though...
	return (
		<Animated.View className="absolute z-20 shrink gap-4 px-1" style={animatedStyles}>
			{footerControls === 'images' && (
				<FlatList
					ref={galleryRef}
					data={Array.from({ length: pages }, (_, i) => i + 1)}
					inverted={readingDirection === 'rtl'}
					keyExtractor={(item) => `gallery-${item}`}
					renderItem={({ item: page, index }) => (
						<View className={cn({ 'pl-1': index === 0, 'pr-1': index === pages - 1 })}>
							<Pressable onPress={() => onChangePage(index)}>
								<View
									className="items-center justify-center overflow-hidden rounded-md shadow-lg"
									style={getSize(index)}
								>
									<FasterImage
										source={{
											url: pageSource(page).uri,
											headers: pageSource(page).headers as Record<string, string>,
											resizeMode: 'cover',
										}}
										style={{
											height: '100%',
											width: '100%',
										}}
									/>
								</View>
							</Pressable>

							{index !== currentPage - 1 && (
								<Text size="sm" className="shrink-0 text-center text-[#898d94]">
									{index + 1}
								</Text>
							)}
						</View>
					)}
					contentContainerStyle={{ gap: 4, alignItems: 'flex-end' }}
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
						inverted={readingDirection === 'rtl'}
						max={100}
					/>
				)}

				{footerControls === 'slider' && (
					<Slider
						maximumValue={pages}
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
							Page {currentPage} of {pages}
						</Text>
					</View>
				</View>
			</View>
		</Animated.View>
	)
}
