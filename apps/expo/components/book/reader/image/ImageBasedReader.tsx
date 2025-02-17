import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { useSDK } from '@stump/client'
import { Image, ImageLoadEventData } from 'expo-image'
import React, { useCallback, useRef, useState } from 'react'
import { FlatList, useWindowDimensions, View } from 'react-native'
import {
	GestureStateChangeEvent,
	State,
	TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
	const flatList = useRef<FlatList>(null)

	const { book, imageSizes = [], onPageChanged } = useImageBasedReader()
	const {
		preferences: { readingMode, incognito },
	} = useBookPreferences(book.id)
	const { height, width } = useWindowDimensions()

	const [sizes, setSizes] = useState<ImageDimension[]>(() => imageSizes)

	const scale = useSharedValue(1)
	const showControls = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)

	const deviceOrientation = width > height ? 'landscape' : 'portrait'

	// TODO: an effect that whenever the device orientation changes to something different than before,
	// recalculate the ratios of the images? Maybe. Who knows, you will though

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

	const onSingleTap = useCallback(
		(event: GestureStateChangeEvent<TapGestureHandlerEventPayload>) => {
			if (event.state !== State.ACTIVE) return
			setShowControls(!showControls)
		},
		[showControls, setShowControls],
	)

	return (
		<Zoomable
			minScale={1}
			maxScale={5}
			scale={scale}
			doubleTapScale={3}
			isSingleTapEnabled
			isDoubleTapEnabled
			onSingleTap={onSingleTap}
			style={{
				flex: 1,
			}}
		>
			<FlatList
				ref={flatList}
				data={Array.from({ length: book.pages }, (_, i) => i)}
				renderItem={({ item }) => (
					<Page
						key={`page-${item}`}
						deviceOrientation={deviceOrientation}
						index={item}
						size={sizes[item]}
						onSizeLoaded={setSizes}
						maxWidth={width}
						maxHeight={height}
						readingDirection="horizontal"
					/>
				)}
				keyExtractor={(item) => item.toString()}
				horizontal={readingMode === 'paged' || readingMode === 'continuous:horizontal'}
				pagingEnabled={readingMode === 'paged'}
				onViewableItemsChanged={({ viewableItems }) => {
					const fistVisibleItemIdx = viewableItems
						.filter(({ isViewable }) => isViewable)
						.at(0)?.index
					if (fistVisibleItemIdx) {
						handlePageChanged(fistVisibleItemIdx + 1)
					}
				}}
				initialNumToRender={5}
				maxToRenderPerBatch={5}
				initialScrollIndex={initialPage - 1}
				// https://stackoverflow.com/questions/53059609/flat-list-scrolltoindex-should-be-used-in-conjunction-with-getitemlayout-or-on
				onScrollToIndexFailed={(info) => {
					console.error("Couldn't scroll to index", info)
					const wait = new Promise((resolve) => setTimeout(resolve, 500))
					wait.then(() => {
						flatList.current?.scrollToIndex({ index: info.index, animated: true })
					})
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
			/>
		</Zoomable>
	)
}

type PageProps = {
	deviceOrientation: string
	index: number
	size?: ImageDimension
	onSizeLoaded: (fn: (prev: ImageDimension[]) => ImageDimension[]) => void
	maxWidth: number
	maxHeight: number
	readingDirection: 'vertical' | 'horizontal'
}
const Page = React.memo(
	({
		// deviceOrientation,
		index,
		size,
		onSizeLoaded,
		maxWidth,
		maxHeight,
		// readingDirection,
	}: PageProps) => {
		const { pageURL } = useImageBasedReader()
		const { sdk } = useSDK()

		const insets = useSafeAreaInsets()

		const onImageLoaded = useCallback(
			(event: ImageLoadEventData) => {
				const { height, width } = event.source
				const ratio = width / height

				const isDifferent = size?.height !== height || size?.width !== width
				if (isDifferent) {
					onSizeLoaded((prev) => {
						const next = [...prev]
						next[index] = { height, width, ratio }
						return next
					})
				}
			},
			[onSizeLoaded, size, index],
		)

		const safeMaxHeight = maxHeight - insets.top - insets.bottom

		return (
			<View
				className="flex items-center justify-center"
				style={{
					height: safeMaxHeight,
					minHeight: safeMaxHeight,
					minWidth: maxWidth,
					width: maxWidth,
				}}
			>
				<Image
					source={{
						uri: pageURL(index + 1),
						headers: {
							Authorization: sdk.authorizationHeader,
						},
					}}
					// TODO: figure out how to render landscape better...
					style={{
						height: '100%',
						width: '100%',
					}}
					contentFit="contain"
					onLoad={onImageLoaded}
				/>
			</View>
		)
	},
)
Page.displayName = 'Page'
