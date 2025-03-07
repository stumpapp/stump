import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { useSDK } from '@stump/client'
import { ImageLoadEventData } from 'expo-image'
import React, { useCallback, useEffect, useMemo } from 'react'
import { FlatList, useWindowDimensions, View } from 'react-native'
import {
	GestureStateChangeEvent,
	State,
	TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Image } from '~/components/Image'
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
}

/**
 * A reader for books that are image-based, where each page should be displayed as an image
 */
export default function ImageBasedReader({ initialPage }: Props) {
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
	} = useBookPreferences(book.id)
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

	return (
		<FlatList
			ref={flatListRef}
			data={pageSets}
			inverted={readingDirection === 'rtl' && readingMode !== 'continuous:vertical'}
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
			horizontal={readingMode === 'paged' || readingMode === 'continuous:horizontal'}
			pagingEnabled={readingMode === 'paged'}
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
			removeClippedSubviews
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
		const {
			book: { id },
			pageURL,
			flatListRef,
			setImageSizes,
		} = useImageBasedReader()
		const {
			preferences: {
				tapSidesToNavigate,
				readingDirection,
				// imageScaling: { scaleToFit },
				cachePolicy,
			},
		} = useBookPreferences(id)
		const { isTablet } = useDisplay()
		const { sdk } = useSDK()

		const insets = useSafeAreaInsets()

		const scale = useSharedValue(1)
		const showControls = useReaderStore((state) => state.showControls)
		const setShowControls = useReaderStore((state) => state.setShowControls)

		const tapThresholdRatio = isTablet ? 4 : 5

		const onCheckForNavigationTaps = useCallback(
			(x: number) => {
				const isLeft = x < maxWidth / tapThresholdRatio
				const isRight = x > maxWidth - maxWidth / tapThresholdRatio

				if (isLeft) {
					const modifier = readingDirection === 'rtl' ? 1 : -1
					flatListRef.current?.scrollToIndex({ index: index + modifier, animated: true })
				} else if (isRight) {
					const modifier = readingDirection === 'rtl' ? -1 : 1
					flatListRef.current?.scrollToIndex({ index: index + modifier, animated: true })
				}

				return isLeft || isRight
			},
			[maxWidth, index, flatListRef, tapThresholdRatio, readingDirection],
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
			(event: ImageLoadEventData, idxIdx: number) => {
				const { height, width } = event.source
				if (!height || !width) return
				const ratio = width / height

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

		const safeMaxHeight = maxHeight - insets.top - insets.bottom

		// https://github.com/candlefinance/faster-image/issues/75
		return (
			<Zoomable
				minScale={1}
				maxScale={5}
				scale={scale}
				doubleTapScale={3}
				isSingleTapEnabled={true}
				isDoubleTapEnabled={true}
				onSingleTap={onSingleTap}
			>
				<View
					className={cn('relative flex justify-center', {
						'mx-auto flex-row gap-0': indexes.length > 1,
					})}
					style={{
						height: safeMaxHeight,
						width: maxWidth,
					}}
				>
					{indexes.map((pageIdx, i) => (
						<Image
							key={pageIdx}
							source={{
								uri: pageURL(pageIdx + 1),
								headers: {
									Authorization: sdk.authorizationHeader,
								},
								cachePolicy,
							}}
							style={{
								height: '100%',
								width: indexes.length > 1 ? '50%' : '100%',
							}}
							contentFit="contain"
							contentPosition={indexes.length > 1 ? (i === 0 ? 'right' : 'left') : 'center'}
							onLoad={(e) => onImageLoaded(e, i)}
							allowDownscaling={false}
						/>
					))}
				</View>
			</Zoomable>
		)
	},
)
Page.displayName = 'Page'
