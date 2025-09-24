import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { useSDK } from '@stump/client'
import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { STUMP_SAVE_BASIC_SESSION_HEADER } from '@stump/sdk/constants'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	FlatList,
	NativeScrollEvent,
	NativeSyntheticEvent,
	useWindowDimensions,
	View,
} from 'react-native'
import {
	GestureStateChangeEvent,
	State,
	TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler'
import { useSharedValue } from 'react-native-reanimated'
import { Success } from 'react-native-turbo-image'

import { TurboImage } from '~/components/Image'
import { useDisplay, usePrevious } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

// TODO: The reading directions don't play well with the pinch and zoom, particularly the continuous
// scroll modes. I think when it is set to continuous, the zoom might have to be on the list?
// Not 100% sure, it is REALLY janky right now.
// TODO: Account for device orientation AND reading direction
// TODO: Account for the image scaling settings
// TODO: Support vertical

// TODO(perf): Use a FlashList instead. I encountered LOTS of issues trying to get it to work, but
// it boasts a lot of performance improvements over the FlatList. Or potentially https://github.com/LegendApp/legend-list ?

type Props = {
	/**
	 * The initial page to start the reader on
	 */
	initialPage: number
	onPastEndReached?: () => void
}

/**
 * A reader for books that are image-based, where each page should be displayed as an image
 */
export default function ImageBasedReader({ initialPage, onPastEndReached }: Props) {
	const {
		book,
		imageSizes = {},
		onPageChanged,
		pageSets,
		currentPage,
		flatListRef,
	} = useImageBasedReader()
	const {
		preferences: { readingMode, incognito, readingDirection },
	} = useBookPreferences({ book })
	const { height, width } = useWindowDimensions()

	const deviceOrientation = useMemo(
		() => (width > height ? 'landscape' : 'portrait'),
		[width, height],
	)

	const previousOrientation = usePrevious(deviceOrientation)
	useEffect(
		() => {
			if (!currentPage) return
			if (deviceOrientation !== previousOrientation) {
				const scrollTo = pageSets.findIndex((set) => set.includes(currentPage - 1))
				if (scrollTo === -1) return
				const timeout = setTimeout(
					() => flatListRef?.current?.scrollToIndex({ index: scrollTo, animated: false }),
					100,
				)
				return () => clearTimeout(timeout)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[deviceOrientation, previousOrientation],
	)

	/**
	 * A callback that updates the read progress of the current page. This will be
	 * called whenever the user changes the page in the reader.
	 *
	 * If the reader is in incognito mode, this will do nothing.
	 */
	const handlePageChanged = useCallback(
		async (page: number) => {
			if (!incognito) {
				onPageChanged?.(page)
			}
		},
		[onPageChanged, incognito],
	)

	useEffect(() => {
		didCallEndReached.current = false
	}, [currentPage])

	// Note: This does not work for Android so we need an alternative solution
	const didCallEndReached = useRef(false)
	const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		if (didCallEndReached.current) return

		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent

		const targetContentOffset = event.nativeEvent.targetContentOffset || contentOffset

		const isPastEnd =
			(readingDirection === ReadingDirection.Ltr &&
				contentOffset.x + layoutMeasurement.width > contentSize.width) ||
			(readingDirection === ReadingDirection.Rtl && contentOffset.x < 0)
		const isTargetPastEnd =
			(readingDirection === ReadingDirection.Ltr &&
				targetContentOffset.x + layoutMeasurement.width > contentSize.width) ||
			(readingDirection === ReadingDirection.Rtl && targetContentOffset.x < 0)

		if (isPastEnd && isTargetPastEnd) {
			didCallEndReached.current = true
			onPastEndReached?.()
		}
	}, [])

	return (
		<FlatList
			ref={flatListRef}
			data={pageSets}
			inverted={
				readingDirection === ReadingDirection.Rtl && readingMode !== ReadingMode.ContinuousVertical
			}
			renderItem={({ item, index }) => (
				<Page
					deviceOrientation={deviceOrientation}
					index={index}
					indexes={item as [number, number]}
					sizes={item.map((i: number) => imageSizes[i]).filter(Boolean)}
					maxWidth={width}
					maxHeight={height}
					readingDirection="horizontal"
				/>
			)}
			keyExtractor={(item) => item.toString()}
			horizontal={
				readingMode === ReadingMode.Paged || readingMode === ReadingMode.ContinuousHorizontal
			}
			pagingEnabled={readingMode === ReadingMode.Paged}
			onViewableItemsChanged={({ viewableItems }) => {
				const firstVisibleItem = viewableItems.filter(({ isViewable }) => isViewable).at(0)
				if (!firstVisibleItem) return

				const { item } = firstVisibleItem
				const page = item.at(-1) + 1

				if (firstVisibleItem) {
					handlePageChanged(page)
				}
			}}
			initialNumToRender={3}
			maxToRenderPerBatch={3}
			windowSize={3}
			initialScrollIndex={pageSets.findIndex((set) => set.includes(initialPage - 1)) || 0}
			// https://stackoverflow.com/questions/53059609/flat-list-scrolltoindex-should-be-used-in-conjunction-with-getitemlayout-or-on
			onScrollToIndexFailed={(info) => {
				console.error("Couldn't scroll to index", info)
				const wait = new Promise((resolve) => setTimeout(resolve, 500))
				wait.then(() => {
					flatListRef.current?.scrollToIndex({ index: info.index, animated: true })
				})
			}}
			viewabilityConfig={{
				itemVisiblePercentThreshold: 100,
			}}
			// Note: We need to define an explicit layout so the initial scroll index works
			// TODO: likely won't work for vertical scrolling
			getItemLayout={(_, index) => ({
				length: width,
				offset: width * index,
				index,
			})}
			showsVerticalScrollIndicator={false}
			showsHorizontalScrollIndicator={false}
			onScroll={handleScroll}
		/>
	)
}

type PageProps = {
	deviceOrientation: string
	index: number
	indexes: [number, number]
	sizes: ImageDimension[]
	maxWidth: number
	maxHeight: number
	readingDirection: 'vertical' | 'horizontal'
}

const Page = React.memo(
	({
		// deviceOrientation,
		index,
		indexes,
		sizes,
		maxWidth,
		maxHeight,
		// readingDirection,
	}: PageProps) => {
		const { book, pageURL, flatListRef, pageSets, setImageSizes } = useImageBasedReader()
		const {
			preferences: { tapSidesToNavigate, readingDirection, allowDownscaling },
		} = useBookPreferences({ book })
		const { isTablet } = useDisplay()
		const { sdk } = useSDK()

		const scale = useSharedValue(1)
		const showControls = useReaderStore((state) => state.showControls)
		const setShowControls = useReaderStore((state) => state.setShowControls)

		const tapThresholdRatio = isTablet ? 4 : 5

		const onCheckForNavigationTaps = useCallback(
			(x: number) => {
				const isLeft = x < maxWidth / tapThresholdRatio
				const isRight = x > maxWidth - maxWidth / tapThresholdRatio

				let modifier = 0
				if (isLeft) modifier = readingDirection === ReadingDirection.Rtl ? 1 : -1
				if (isRight) modifier = readingDirection === ReadingDirection.Rtl ? -1 : 1

				const nextIndex = index + modifier
				if (nextIndex >= 0 && nextIndex < pageSets.length) {
					flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true })
				}

				return isLeft || isRight
			},
			[maxWidth, index, flatListRef, tapThresholdRatio, readingDirection, pageSets],
		)

		const onSingleTap = useCallback(
			(event: GestureStateChangeEvent<TapGestureHandlerEventPayload>) => {
				if (event.state !== State.ACTIVE) return

				if (!tapSidesToNavigate) {
					setShowControls(!showControls)
					return
				}

				const didNavigate = onCheckForNavigationTaps(event.x)
				if (!didNavigate) {
					setShowControls(!showControls)
				}
			},
			[showControls, setShowControls, onCheckForNavigationTaps, tapSidesToNavigate],
		)

		const onImageLoaded = useCallback(
			(event: NativeSyntheticEvent<Success>, idxIdx: number) => {
				const { height, width } = event.nativeEvent
				if (!height || !width) return
				const ratio = width / height
				setImageRatio(ratio)

				const pageSize = sizes[idxIdx]
				const isDifferent = pageSize?.height !== height || pageSize?.width !== width
				if (isDifferent) {
					setImageSizes((prev) => {
						const actualIdx = indexes[idxIdx]
						prev[actualIdx] = { height, width, ratio }
						return prev
					})
				}
			},
			[setImageSizes, sizes, indexes],
		)

		const [imageRatio, setImageRatio] = useState<number | undefined>(undefined)
		const roughPageRenderWidth = indexes.length > 1 ? maxWidth / 2 : maxWidth

		return (
			<Zoomable
				minScale={1}
				maxScale={5}
				scale={scale}
				doubleTapScale={2.5}
				isSingleTapEnabled={true}
				isDoubleTapEnabled={true}
				onSingleTap={onSingleTap}
			>
				<View
					className={cn('relative flex-row items-center justify-center', {
						'mx-auto gap-0': indexes.length > 1,
					})}
					style={{ height: maxHeight, width: maxWidth }}
				>
					{indexes.map((pageIdx, i) => {
						return (
							<TurboImage
								key={`${pageIdx}-${i}`}
								source={{
									uri: pageURL(pageIdx + 1),
									headers: {
										Authorization: sdk.authorizationHeader || '',
										[STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
									},
								}}
								style={{
									height: '100%',
									maxWidth: indexes.length > 1 ? '50%' : '100%',
									aspectRatio: imageRatio,
								}}
								indicator={{ color: 'transparent' }}
								resizeMode="contain"
								resize={allowDownscaling ? roughPageRenderWidth * 1.2 : undefined}
								onSuccess={(event) => onImageLoaded(event, i)}
							/>
						)
					})}
				</View>
			</Zoomable>
		)
	},
)
Page.displayName = 'Page'
