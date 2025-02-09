import {
	ReactNativeZoomableView,
	ZoomableViewEvent,
} from '@openspacelabs/react-native-zoomable-view'
import { useSDK, useUpdateMediaProgress } from '@stump/client'
import { isAxiosError } from '@stump/sdk'
import { Media } from '@stump/sdk'
import { Image } from 'expo-image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	FlatList,
	GestureResponderEvent,
	PanResponderGestureState,
	TouchableWithoutFeedback,
	useWindowDimensions,
	View,
} from 'react-native'
import { GestureHandlerGestureEvent, State, TapGestureHandler } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '~/components/ui'
import { useReaderStore } from '~/stores'

import ImageBasedReaderContainer from './Container'
import { useImageBasedReader } from './context'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

// TODO: This is an image-based reader right now. Extract this to a separate component
// which is rendered when the book is an image-based book.

// TODO: Account for device orientation AND reading direction

type Props = {
	/**
	 * The initial page to start the reader on
	 */
	initialPage: number
	/**
	 * Whether the reader should be in incognito mode
	 */
	incognito?: boolean
}

// TODO: refactor to be agnostic so both Stump and OPDS can use it
/**
 * A reader for books that are image-based, where each page should be displayed as an image
 */
export default function ImageBasedReader({ initialPage, incognito }: Props) {
	const flatList = useRef<FlatList>(null)

	const { book } = useImageBasedReader()
	const { height, width } = useWindowDimensions()

	const [imageSizes, setImageHeights] = useState<Record<number, ImageDimension>>({})
	const [isZoomed, setIsZoomed] = useState(false)

	// const lastPrefetchStart = useRef(0)
	// FIXME: useBookPreferences and get the reader mode from there
	// const readerMode = useReaderStore((state) => state.mode)
	const readerMode = 'paged'

	const deviceOrientation = width > height ? 'landscape' : 'portrait'

	// TODO: an effect that whenever the device orientation changes to something different than before,
	// recalculate the ratios of the images? Maybe. Who knows, you will though

	const { updateReadProgressAsync } = useUpdateMediaProgress(book.id)

	/**
	 * A callback that updates the read progress of the current page. This will be
	 * called whenever the user changes the page in the reader.
	 *
	 * If the reader is in incognito mode, this will do nothing.
	 */
	const handleCurrentPageChanged = useCallback(
		async (page: number) => {
			if (!incognito) {
				try {
					await updateReadProgressAsync(page)
					// if (page - lastPrefetchStart.current > 5) {
					// 	await prefetchPages(page, page + 5)
					// }
					// lastPrefetchStart.current = page
				} catch (e) {
					console.error(e)
					if (isAxiosError(e)) {
						console.error(e.response?.data)
					}
				}
			}
		},
		[updateReadProgressAsync, incognito],
	)

	return (
		<ImageBasedReaderContainer>
			<FlatList
				ref={flatList}
				data={Array.from({ length: book.pages }, (_, i) => i)}
				renderItem={({ item }) => (
					<Page
						key={`page-${item}`}
						deviceOrientation={deviceOrientation}
						id={book.id}
						index={item}
						imageSizes={imageSizes}
						setImageHeights={setImageHeights}
						maxWidth={width}
						maxHeight={height}
						// readingDirection="vertical"
						readingDirection="horizontal"
						onZoomChanged={setIsZoomed}
					/>
				)}
				keyExtractor={(item) => item.toString()}
				horizontal={readerMode === 'paged'}
				pagingEnabled={readerMode === 'paged'}
				onViewableItemsChanged={({ viewableItems }) => {
					const fistVisibleItemIdx = viewableItems
						.filter(({ isViewable }) => isViewable)
						.at(0)?.index
					if (fistVisibleItemIdx) {
						handleCurrentPageChanged(fistVisibleItemIdx + 1)
					}
				}}
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				initialScrollIndex={initialPage - 1}
				// https://stackoverflow.com/questions/53059609/flat-list-scrolltoindex-should-be-used-in-conjunction-with-getitemlayout-or-on
				onScrollToIndexFailed={(info) => {
					const wait = new Promise((resolve) => setTimeout(resolve, 500))
					wait.then(() => {
						flatList.current?.scrollToIndex({ index: info.index, animated: true })
					})
				}}
				scrollEnabled={!isZoomed}
			/>
		</ImageBasedReaderContainer>
	)
}

type PageProps = {
	deviceOrientation: string
	id: string
	index: number
	imageSizes: Record<number, ImageDimension>
	setImageHeights: (
		fn: (prev: Record<number, ImageDimension>) => Record<number, ImageDimension>,
	) => void
	maxWidth: number
	maxHeight: number
	readingDirection: 'vertical' | 'horizontal'
	onZoomChanged: (isZoomed: boolean) => void
}
const Page = React.memo(
	({
		deviceOrientation,
		id,
		index,
		imageSizes,
		setImageHeights,
		maxWidth,
		maxHeight,
		readingDirection,
		onZoomChanged,
	}: PageProps) => {
		const { sdk } = useSDK()
		const insets = useSafeAreaInsets()

		const zoomRef = useRef<ReactNativeZoomableView>(null)
		const doubleTapRef = useRef<TouchableWithoutFeedback>(null)

		const [zoomLevel, setZoomLevel] = useState(() => 1)

		// const handlePress = useCallback(() => {
		// 	setSettings({ showToolBar: !showToolBar })
		// }, [showToolBar, setSettings])
		const showControls = useReaderStore((state) => state.showControls)
		const setShowControls = useReaderStore((state) => state.setShowControls)

		const onSingleTap = useCallback(
			(event: GestureHandlerGestureEvent) => {
				if (event.nativeEvent.state !== State.ACTIVE) return

				setShowControls(!showControls)
			},
			[showControls, setShowControls],
		)

		// TODO: better double tap handling
		const isZoomed = useMemo(() => zoomLevel > 1, [zoomLevel])

		const onDoubleTap = useCallback(
			(event: GestureHandlerGestureEvent) => {
				if (!zoomRef.current) return
				if (event.nativeEvent.state !== State.ACTIVE) return

				// Providing x and y will change zoom relative to the area that was double-tapped.
				// This is important for zooming in and out, but definitely makes a smoother difference
				// when zooming out
				const params =
					typeof event.nativeEvent.x === 'number' && typeof event.nativeEvent.y === 'number'
						? { x: event.nativeEvent.x, y: event.nativeEvent.y }
						: undefined

				if (isZoomed) {
					zoomRef.current.zoomTo(1, params)
				} else {
					zoomRef.current.zoomTo(2, params)
				}
			},
			[isZoomed],
		)

		const onZoomChange = (
			_event: GestureResponderEvent | null,
			_gestureState: PanResponderGestureState | null,
			{ zoomLevel }: ZoomableViewEvent,
		) => setZoomLevel(zoomLevel)

		useEffect(() => {
			onZoomChanged(isZoomed)
		}, [isZoomed, onZoomChanged])

		/**
		 * A memoized value that represents the size(s) of the image dimensions for the current page.
		 */
		const pageSize = useMemo(() => imageSizes[index + 1], [imageSizes, index])

		const safeMaxHeight = maxHeight - insets.top - insets.bottom

		// We always want to display the image at the full width of the screen,
		// and then calculate the height based on the aspect ratio of the image.
		const { height, width } = useMemo(() => {
			if (!pageSize) {
				return {
					height: safeMaxHeight,
					width: maxWidth,
				}
			}

			const { ratio } = pageSize

			if (deviceOrientation == 'landscape') {
				return {
					height: safeMaxHeight,
					width: safeMaxHeight / ratio,
				}
			} else {
				return {
					height: maxWidth / ratio,
					width: maxWidth,
				}
			}
		}, [deviceOrientation, pageSize, safeMaxHeight, maxWidth])

		return (
			<TapGestureHandler onHandlerStateChange={onSingleTap} numberOfTaps={1} waitFor={doubleTapRef}>
				<TapGestureHandler ref={doubleTapRef} onHandlerStateChange={onDoubleTap} numberOfTaps={2}>
					<ReactNativeZoomableView
						ref={zoomRef}
						maxZoom={5}
						minZoom={1}
						zoomStep={0.5}
						initialZoom={1}
						bindToBorders={true}
						panEnabled={isZoomed}
						movementSensibility={isZoomed ? 1 : 5}
						pinchToZoomInSensitivity={1}
						onZoomAfter={onZoomChange}
					>
						<View
							className="flex items-center justify-center"
							style={{
								height: safeMaxHeight,
								minHeight: safeMaxHeight,
								minWidth: maxWidth,
								width: maxWidth,
								marginTop: insets.top,
								marginBottom: insets.bottom,
							}}
						>
							<Image
								source={{
									uri: sdk.media.bookPageURL(id, index + 1),
									headers: {
										Authorization: sdk.authorizationHeader,
									},
								}}
								// style={{
								// 	alignSelf: readingDirection === 'horizontal' ? 'center' : undefined,
								// 	height,
								// 	width,
								// }}
								style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
								onLoad={({ source: { height, width } }) => {
									setImageHeights((prev) => ({
										...prev,
										[index + 1]: {
											height,
											ratio: deviceOrientation == 'landscape' ? height / width : width / height,
											width,
										},
									}))
								}}
							/>
						</View>
					</ReactNativeZoomableView>
				</TapGestureHandler>
			</TapGestureHandler>
		)
	},
)
Page.displayName = 'Page'
