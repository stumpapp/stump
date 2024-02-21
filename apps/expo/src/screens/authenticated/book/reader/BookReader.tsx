import { RouteProp, useRoute } from '@react-navigation/native'
import { getMediaPage } from '@stump/api'
import { useMediaByIdQuery, useUpdateMediaProgress } from '@stump/client'
import { useColorScheme } from 'nativewind'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Image, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ScreenRootView, Text } from '@/components'
import LandscapePageContainer from '@/components/LandscapePageContainer'
import { gray } from '@/constants/colors'

type Params = {
	params: {
		id: string
	}
}

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

// TODO: This is an image-based reader right now. Extract this to a separate component
// which is readered when the book is an image-based book.

// TODO: Account for device orientation AND reading direction

/**
 * A sort of weigh station that renders the corresponding reader for a given media, e.g.
 * EPUBReader, ImageBasedReader, etc.
 */
export default function BookReader() {
	const {
		params: { id },
	} = useRoute<RouteProp<Params>>()

	const { height, width } = useWindowDimensions()
	const { colorScheme } = useColorScheme()

	const [imageSizes, setImageHeights] = useState<Record<number, ImageDimension>>({})

	const deviceOrientation = width > height ? 'landscape' : 'portrait'

	// TODO: an effect that whenever the device orienation changes to something different than before,
	// recalculate the ratios of the images? Maybe. Who knows, you will though

	const { isLoading: fetchingBook, media } = useMediaByIdQuery(id)
	const { updateReadProgress } = useUpdateMediaProgress(id)

	/**
	 * A callback that updates the read progress of the current page. This will be
	 * called whenever the user changes the page in the reader.
	 */
	const handleCurrentPageChanged = useCallback(
		(page: number) => updateReadProgress(page),
		[updateReadProgress],
	)

	if (fetchingBook) {
		return <Text>Loading...</Text>
	} else if (!media) {
		return <Text>Book not found</Text>
	}

	return (
		<ScreenRootView>
			<FlatList
				style={{ backgroundColor: colorScheme === 'dark' ? gray[950] : undefined }}
				data={Array.from({ length: media.pages }, (_, i) => i)}
				renderItem={({ item }) => (
					<Page
						deviceOrientation={deviceOrientation}
						key={item}
						id={id}
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
				horizontal
				pagingEnabled
				onViewableItemsChanged={({ viewableItems }) => {
					const fistVisibleItemIdx = viewableItems
						.filter(({ isViewable }) => isViewable)
						.at(0)?.index
					if (fistVisibleItemIdx) {
						handleCurrentPageChanged(fistVisibleItemIdx + 1)
					}
				}}
				// initialNumToRender={5}
				// maxToRenderPerBatch={5}
			/>
		</ScreenRootView>
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
		const [base64Image, setBase64Image] = useState<string | null>(null)

		const insets = useSafeAreaInsets()

		// TODO: make a custom EntityImage to reuse this fetch logic since we will require
		// it often
		const fetchImage = useCallback(async (url: string) => {
			try {
				const response = await fetch(url)
				const blob = await response.blob()
				const reader = new FileReader()
				reader.onloadend = () => {
					setBase64Image(reader.result as string)
				}
				reader.readAsDataURL(blob)
			} catch (e) {
				console.error(e)
			}
		}, [])

		useEffect(() => {
			if (!base64Image) {
				fetchImage(getMediaPage(id, index + 1))
			}
		}, [base64Image, fetchImage, id, index])

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

		if (!base64Image) {
			return null
		}

		const Container = deviceOrientation === 'landscape' ? LandscapePageContainer : React.Fragment

		return (
			<Container width={maxWidth} height={safeMaxHeight} key={`page-${index}`}>
				<Image
					source={{ uri: base64Image }}
					style={{
						alignSelf: readingDirection === 'horizontal' ? 'center' : undefined,
						flex: 1,
						height,
						width,
					}}
					onLoad={({
						nativeEvent: {
							source: { height, width },
						},
					}) => {
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
			</Container>
		)
	},
)
Page.displayName = 'Page'
