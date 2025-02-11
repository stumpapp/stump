import { useSDK, useUpdateMediaProgress } from '@stump/client'
import { isAxiosError } from '@stump/sdk'
import { Image, ImageLoadEventData } from 'expo-image'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native'
import {
	GestureStateChangeEvent,
	State,
	TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Zoomable } from '@likashefqet/react-native-image-zoom'

import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'
import { useSharedValue } from 'react-native-reanimated'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

// TODO: The reading directions don't play well with the pinch and zoom, particularly the continuous
// scroll modes. I think when it is set to continuous, the zoom might have to be on the list?
// Not 100% sure, it is REALLY janky right now.
// TODO: depending on above, remove @openspacelabs/react-native-zoomable-view. Zoomable might be enough!!!

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
				onPageChanged(page)
			}
		},
		[onPageChanged, incognito],
	)

	return (
		<FlatList
			ref={flatList}
			data={Array.from({ length: book.pages }, (_, i) => i)}
			renderItem={({ item }) => (
				<Page
					key={`page-${item}`}
					deviceOrientation={deviceOrientation}
					index={item}
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
				const fistVisibleItemIdx = viewableItems.filter(({ isViewable }) => isViewable).at(0)?.index
				if (fistVisibleItemIdx) {
					handlePageChanged(fistVisibleItemIdx + 1)
				}
			}}
			initialNumToRender={10}
			maxToRenderPerBatch={10}
			initialScrollIndex={initialPage - 1}
			// https://stackoverflow.com/questions/53059609/flat-list-scrolltoindex-should-be-used-in-conjunction-with-getitemlayout-or-on
			onScrollToIndexFailed={() => {
				const wait = new Promise((resolve) => setTimeout(resolve, 500))
				wait.then(() => {
					flatList.current?.scrollToIndex({ index: initialPage - 1, animated: true })
				})
			}}
			showsVerticalScrollIndicator={false}
			showsHorizontalScrollIndicator={false}
		/>
	)
}

type PageProps = {
	deviceOrientation: string
	index: number
	onSizeLoaded: (fn: (prev: ImageDimension[]) => ImageDimension[]) => void
	maxWidth: number
	maxHeight: number
	readingDirection: 'vertical' | 'horizontal'
}
const Page = React.memo(
	({
		deviceOrientation,
		index,
		onSizeLoaded,
		maxWidth,
		maxHeight,
		// readingDirection,
	}: PageProps) => {
		const { pageURL, imageSizes = [] } = useImageBasedReader()
		const { sdk } = useSDK()
		const insets = useSafeAreaInsets()

		const scale = useSharedValue(1)

		const showControls = useReaderStore((state) => state.showControls)
		const setShowControls = useReaderStore((state) => state.setShowControls)

		const onSingleTap = useCallback(
			(event: GestureStateChangeEvent<TapGestureHandlerEventPayload>) => {
				if (event.state !== State.ACTIVE) return
				setShowControls(!showControls)
			},
			[showControls, setShowControls],
		)

		/**
		 * A memoized value that represents the size(s) of the image dimensions for the current page.
		 */
		const pageSize = useMemo(() => imageSizes[index], [imageSizes, index])

		const onImageLoaded = useCallback(
			(event: ImageLoadEventData) => {
				const { height, width } = event.source
				const ratio = width / height

				const isDifferent = pageSize?.height !== height || pageSize?.width !== width
				if (isDifferent) {
					onSizeLoaded((prev) => {
						const next = [...prev]
						next[index] = { height, width, ratio }
						return next
					})
				}
			},
			[onSizeLoaded, pageSize],
		)

		const safeMaxHeight = maxHeight - insets.top - insets.bottom

		// We always want to display the image at the full width of the screen,
		// and then calculate the height based on the aspect ratio of the image.
		const _todo = useMemo(() => {
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
			</Zoomable>
		)
	},
)
Page.displayName = 'Page'
