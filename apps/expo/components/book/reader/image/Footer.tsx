import { Slider } from '@miblanchard/react-native-slider'
import { useSDK } from '@stump/client'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { Image } from 'expo-image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { FlatList, Pressable } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Progress, Text } from '~/components/ui'
import { useDisplay, usePrevious } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { useReaderStore } from '~/stores'
import { useBookPreferences, useBookReadTime } from '~/stores/reader'

import { useImageBasedReader } from './context'

dayjs.extend(duration)

const HEIGHT_MODIFIER = 0.75
const WIDTH_MODIFIER = 2 / 3

// FIXME: The image gallery, frankly, is ass. It doesn't want to retain
// focus (scroll position) on the current page (synced from the reader). It's
// a bit frustrating at this point.

export default function Footer() {
	const { sdk } = useSDK()
	const { isTablet, height } = useDisplay()
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

	const ref = useRef<FlatList>(null)
	const insets = useSafeAreaInsets()

	const visible = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)

	const translateY = useSharedValue(0)
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
		(_: ArrayLike<number> | null | undefined, index: number) => ({
			length: getSize(index).width,
			offset: getSize(index).width * index /* + (index === 0 || index === pages - 1 ? 4 : 0)*/,
			index,
		}),
		[getSize],
	)

	const onChangePage = useCallback(
		(idx: number) => {
			setShowControls(false)
			readerRef.current?.scrollToIndex({ index: idx, animated: false })
		},
		[readerRef, setShowControls],
	)

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
			Image.prefetch(urls, {
				headers: {
					Authorization: sdk.authorizationHeader || '',
				},
				// cachePolicy: 'memory',
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

	const renderAboveThumbComponent = useCallback(
		(_: number, value: number) => {
			if (value < 0 || value >= pages) return null

			const actualPage = readingDirection === 'rtl' ? pages - value : value
			if (actualPage === currentPage) return null

			return (
				<View
					style={{
						height: isTablet ? 300 : 200,
						width: isTablet ? 200 : 150,
						transform: [
							// TODO: as we are close to either end of the screen, we need to offset the translation
							// as to avoid going off-screen
							{ translateX: isTablet ? -100 : -75 },
							{
								translateY: isTablet ? -20 : -10,
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
						<Image
							source={pageSource(actualPage)}
							cachePolicy="memory"
							style={{
								width: '100%',
								height: '100%',
							}}
							contentFit="fill"
						/>
					</View>

					<Text className="text-center">{actualPage}</Text>
				</View>
			)
		},
		[currentPage, pages, readingDirection, isTablet, pageSource],
	)

	const onSlidingComplete = useCallback(
		(page: number) => {
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
		if (previousReadingDirection !== readingDirection) {
			const newValue = readingDirection === 'rtl' ? pages - currentPage : currentPage
			setSliderValue(newValue)
		}
	}, [currentPage, pages, readingDirection, previousReadingDirection])

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

	return (
		<Animated.View className="absolute z-20 shrink gap-4 px-1" style={animatedStyles}>
			{footerControls === 'images' && (
				<FlatList
					ref={ref}
					data={Array.from({ length: pages }, (_, i) => i + 1)}
					inverted={readingDirection === 'rtl'}
					keyExtractor={(item) => item.toString()}
					renderItem={({ item: page, index }) => (
						<View className={cn({ 'pl-1': index === 0, 'pr-1': index === pages - 1 })}>
							<Pressable onPress={() => onChangePage(index)}>
								<View className="aspect-[2/3] items-center justify-center overflow-hidden rounded-xl shadow-lg">
									<Image
										source={pageSource(page)}
										cachePolicy="memory"
										style={getSize(index)}
										contentFit="fill"
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
					initialScrollIndex={currentPage - 1}
					windowSize={5}
					initialNumToRender={isTablet ? 8 : 6}
					maxToRenderPerBatch={isTablet ? 8 : 6}
				/>
			)}

			<View className="gap-2 px-1">
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
					/>
				)}

				<View className="flex flex-row justify-between">
					<View>
						{trackElapsedTime && (
							<Text className="text-sm text-[#898d94]">Reading time: {formatDuration()}</Text>
						)}
					</View>

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
