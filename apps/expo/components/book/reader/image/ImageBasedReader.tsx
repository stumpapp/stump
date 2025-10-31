import { Zoomable, ZoomableRef } from '@likashefqet/react-native-image-zoom'
import { FlashList, useMappingHelper } from '@shopify/flash-list'
import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { STUMP_SAVE_BASIC_SESSION_HEADER } from '@stump/sdk/constants'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions, View } from 'react-native'
import {
	GestureStateChangeEvent,
	State,
	TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
// When Zoomable is on the list for continuous scrolling, panning is weird because there is the list scroll
// and the Zoomable pan, but Zoomable pan vertically/horizontally won't scroll the vertical/horizontal list
// TODO: Account for device orientation AND reading direction
// TODO: Account for the image scaling settings

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
		flashListRef,
		serverId,
	} = useImageBasedReader()
	const {
		preferences: { readingMode, incognito, readingDirection, doublePageBehavior },
	} = useBookPreferences({ book, serverId })
	const { height, width } = useWindowDimensions()
	const insets = useSafeAreaInsets()

	const deviceOrientation = useMemo(
		() => (width > height ? 'landscape' : 'portrait'),
		[width, height],
	)

	const deviceOrientationChanged = usePrevious(deviceOrientation) !== deviceOrientation
	const doublePageBehaviorChanged = usePrevious(doublePageBehavior) !== doublePageBehavior
	useEffect(
		() => {
			if (!currentPage) return
			if (deviceOrientationChanged || doublePageBehaviorChanged) {
				const scrollTo = pageSets.findIndex((set) => set.includes(currentPage - 1))
				if (scrollTo === -1) return
				flashListRef?.current?.scrollToIndex({ index: scrollTo, animated: false })
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[deviceOrientationChanged, doublePageBehaviorChanged],
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

		// invertion transform accounts for RTL already
		const isPastEnd = contentOffset.x + layoutMeasurement.width > contentSize.width
		const isTargetPastEnd = targetContentOffset.x + layoutMeasurement.width > contentSize.width

		if (isPastEnd && isTargetPastEnd) {
			didCallEndReached.current = true
			onPastEndReached?.()
		}
	}, [])

	const isRtl = readingDirection === ReadingDirection.Rtl
	const isVertical = readingMode === ReadingMode.ContinuousVertical
	return (
		<View style={[{ width, height }, isRtl && { transform: [{ scaleX: -1 }] }]}>
			<FlashList
				key={isVertical ? 'vertical' : 'horizontal'}
				ref={flashListRef}
				data={pageSets}
				keyExtractor={(item) => item.toString()}
				renderItem={({ item, index }) => (
					<PageSet
						deviceOrientation={deviceOrientation}
						index={index}
						indexes={item as [number, number]}
						sizes={item.map((i: number) => imageSizes[i]).filter(Boolean)}
						maxWidth={width}
						maxHeight={height}
						readingDirection="horizontal"
						onPastEndReached={onPastEndReached}
					/>
				)}
				getItemType={(item) => {
					if (item.length === 2) return 'double'
					else if ((imageSizes?.[item[0]]?.ratio || 0) >= 1) return 'landscape'
					else return 'single'
				}}
				contentContainerStyle={
					isVertical && { paddingTop: insets.top, paddingBottom: insets.bottom }
				}
				horizontal={!isVertical}
				pagingEnabled={readingMode === ReadingMode.Paged}
				drawDistance={isVertical ? height : width}
				viewabilityConfig={{ viewAreaCoveragePercentThreshold: 20 }}
				onViewableItemsChanged={({ viewableItems }) => {
					const firstVisibleItem = viewableItems.filter(({ isViewable }) => isViewable).at(0)
					if (!firstVisibleItem) return

					const { item } = firstVisibleItem
					const page = item[item.length - 1] + 1

					if (firstVisibleItem) {
						handlePageChanged(page)
					}
				}}
				initialScrollIndex={
					// If we change between 'vertical' and 'horizontal' key, we want the current page instead
					pageSets.findIndex((set) => set.includes((currentPage ?? initialPage) - 1)) || 0
				}
				initialScrollIndexParams={isVertical ? { viewOffset: -insets.top } : undefined}
				showsHorizontalScrollIndicator={false}
				onScroll={handleScroll}
			/>
		</View>
	)
}

type PageSetProps = {
	deviceOrientation: string
	index: number
	indexes: [number, number]
	sizes: ImageDimension[]
	maxWidth: number
	maxHeight: number
	readingDirection: 'vertical' | 'horizontal'
	onPastEndReached?: () => void
}

const PageSet = React.memo(
	({
		// deviceOrientation,
		index,
		indexes,
		sizes,
		maxWidth,
		maxHeight,
		onPastEndReached,
		// readingDirection,
	}: PageSetProps) => {
		const { book, pageURL, flashListRef, pageSets, setImageSizes, requestHeaders, serverId } =
			useImageBasedReader()
		const {
			preferences: { tapSidesToNavigate, readingDirection, readingMode, allowDownscaling },
		} = useBookPreferences({ book, serverId })
		const { isTablet } = useDisplay()
		const { getMappingKey } = useMappingHelper()

		const scale = useSharedValue(1)
		const showControls = useReaderStore((state) => state.showControls)
		const setShowControls = useReaderStore((state) => state.setShowControls)

		const tapThresholdRatio = isTablet ? 4 : 5

		const zoomableRef = useRef<ZoomableRef>(null)

		const onCheckForNavigationTaps = useCallback(
			(x: number) => {
				if (readingMode === ReadingMode.ContinuousVertical) return

				const isLeft = x < maxWidth / tapThresholdRatio
				const isRight = x > maxWidth - maxWidth / tapThresholdRatio

				let modifier = 0
				if (isLeft) modifier = readingDirection === ReadingDirection.Rtl ? 1 : -1
				if (isRight) modifier = readingDirection === ReadingDirection.Rtl ? -1 : 1

				const nextIndex = index + modifier
				if (nextIndex >= 0 && nextIndex < pageSets.length) {
					flashListRef.current?.scrollToIndex({ index: nextIndex, animated: true })
				}

				if (nextIndex === pageSets.length) onPastEndReached?.()

				return isLeft || isRight
			},
			[
				maxWidth,
				index,
				flashListRef,
				tapThresholdRatio,
				readingDirection,
				pageSets,
				onPastEndReached,
				readingMode,
			],
		)

		const onSingleTap = useCallback(
			(event: GestureStateChangeEvent<TapGestureHandlerEventPayload>) => {
				if (event.state !== State.ACTIVE) return

				if (!tapSidesToNavigate) {
					setShowControls(!showControls)
					return
				}

				const didNavigate = onCheckForNavigationTaps(event.x)
				if (didNavigate) {
					zoomableRef.current?.reset()
				} else {
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

		const isRtl = readingDirection === ReadingDirection.Rtl
		const directionRespectingIndexes = isRtl ? [...indexes].reverse() : indexes

		return (
			<View style={isRtl && { transform: [{ scaleX: -1 }] }}>
				<Zoomable
					ref={zoomableRef}
					minScale={1}
					maxScale={5}
					scale={scale}
					doubleTapScale={2.5}
					isSingleTapEnabled={true}
					isDoubleTapEnabled={true}
					onSingleTap={onSingleTap}
					onDoubleTap={(zoomType) => {
						if (zoomType === 'ZOOM_OUT') {
							setTimeout(() => {
								zoomableRef.current?.reset()
							}, 0)
						}
					}}
				>
					<View
						className={cn('relative flex-row items-center justify-center', {
							'mx-auto gap-0': indexes.length > 1,
						})}
						style={{
							height:
								// For the paged reader, this container takes the whole height so we can center vertically,
								// but for the vertical reader we only want it to take the image height
								imageRatio && readingMode === ReadingMode.ContinuousVertical
									? maxWidth / imageRatio
									: maxHeight,
							width: maxWidth,
						}}
					>
						{directionRespectingIndexes.map((pageIdx, i) => {
							return (
								<TurboImage
									key={getMappingKey(pageIdx, i)}
									source={{
										uri: pageURL(pageIdx + 1),
										headers: {
											...requestHeaders?.(),
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
			</View>
		)
	},
)
PageSet.displayName = 'PageSet'
