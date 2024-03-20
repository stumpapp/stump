import { getMediaPage, isAxiosError } from '@stump/api'
import { useUpdateMediaProgress } from '@stump/client'
import { Media } from '@stump/types'
import { useColorScheme } from 'nativewind'
import React, { useCallback, useMemo, useState } from 'react'
import { FlatList, TouchableWithoutFeedback, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { View } from '@/components'
import EntityImage from '@/components/EntityImage'
import { gray } from '@/constants/colors'
import { useReaderStore } from '@/stores'

import ReaderContainer from './ReaderContainer'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

// TODO: This is an image-based reader right now. Extract this to a separate component
// which is readered when the book is an image-based book.

// TODO: Account for device orientation AND reading direction

type Props = {
	/**
	 * The media which is being read
	 */
	book: Media
	/**
	 * The initial page to start the reader on
	 */
	initialPage: number
	/**
	 * Whether the reader should be in incognito mode
	 */
	incognito?: boolean
}

/**
 * A reader for books that are image-based, where each page should be displayed as an image
 */
export default function ImageBasedReader({ book, initialPage, incognito }: Props) {
	const { height, width } = useWindowDimensions()
	const { colorScheme } = useColorScheme()

	const [imageSizes, setImageHeights] = useState<Record<number, ImageDimension>>({})

	// const lastPrefetchStart = useRef(0)
	const readerMode = useReaderStore((state) => state.mode)

	const deviceOrientation = width > height ? 'landscape' : 'portrait'

	// TODO: an effect that whenever the device orienation changes to something different than before,
	// recalculate the ratios of the images? Maybe. Who knows, you will though

	const { updateReadProgressAsync } = useUpdateMediaProgress(book.id)

	// FIXME: this was HARD erroring...

	// const prefetchPages = useCallback(
	// 	async (start: number, end: number) => {
	// 		for (let i = start; i <= end; i++) {
	// 			const prefetched = await prefetchImage(getMediaPage(id, i))
	// 			console.log('Prefetched', i, prefetched)
	// 		}
	// 	},
	// 	[id],
	// )

	// useEffect(() => {
	// 	if (lastPrefetchStart.current === 0) {
	// 		prefetchPages(1, 5)
	// 		lastPrefetchStart.current = 5
	// 	}
	// }, [prefetchPages])

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
		<ReaderContainer>
			<FlatList
				style={{ backgroundColor: colorScheme === 'dark' ? gray[950] : undefined }}
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
			/>
		</ReaderContainer>
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
	}: PageProps) => {
		const insets = useSafeAreaInsets()

		const { showToolBar, setShowToolBar } = useReaderStore((state) => ({
			setShowToolBar: state.setShowToolBar,
			showToolBar: state.showToolBar,
		}))

		const handlePress = useCallback(() => {
			setShowToolBar(!showToolBar)
		}, [showToolBar, setShowToolBar])

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
			<TouchableWithoutFeedback onPress={handlePress}>
				<View
					className="flex items-center justify-center"
					style={{
						height: safeMaxHeight,
						minHeight: safeMaxHeight,
						minWidth: maxWidth,
						width: maxWidth,
					}}
				>
					<EntityImage
						url={getMediaPage(id, index + 1)}
						style={{
							alignSelf: readingDirection === 'horizontal' ? 'center' : undefined,
							height,
							width,
						}}
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
			</TouchableWithoutFeedback>
		)
	},
)
Page.displayName = 'Page'
