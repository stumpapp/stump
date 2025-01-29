import { useSDK } from '@stump/client'
import { Image, ImageLoadEventData } from 'expo-image'
import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'

import { usePublicationContext } from './context'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

export default function Screen() {
	const insets = useSafeAreaInsets()
	const { sdk } = useSDK()
	const {
		publication: { readingOrder = [] },
		progression,
	} = usePublicationContext()
	const { height, width } = useDisplay()

	const [imageSizes, setImageHeights] = useState<Record<number, ImageDimension>>(() =>
		readingOrder.reduce(
			(acc, { width, height }, index) => {
				if (!width || !height) return acc
				acc[index] = { width, height, ratio: width / height }
				return acc
			},
			{} as Record<number, ImageDimension>,
		),
	)

	const safeMaxHeight = useMemo(() => height - insets.top - insets.bottom, [height, insets])

	// TODO: make actually correct
	const getPageSize = useCallback(
		(idx: number) => {
			if (!imageSizes[idx]) {
				return { width, height: safeMaxHeight }
			} else {
				const { ratio } = imageSizes[idx]
				const size = { width, height: width / ratio }
				return size
			}
		},
		[imageSizes, width, safeMaxHeight],
	)

	const onImageLoaded = useCallback(
		({ source: { height, width } }: ImageLoadEventData, idx: number) => {
			if (!width || !height) return
			if (imageSizes[idx]) return
			setImageHeights((prev) => ({
				...prev,
				[idx]: { height, width, ratio: width / height },
			}))
		},
		[imageSizes],
	)

	const currentPage = useMemo(() => {
		const rawPosition = progression?.locator.locations?.at(0)?.position
		if (!rawPosition) {
			return 1
		}
		const parsedPosition = parseInt(rawPosition, 10)
		if (isNaN(parsedPosition)) {
			return 1
		}
		return parsedPosition
	}, [progression])

	const flatList = useRef<FlatList>(null)

	return (
		<View className="flex flex-1 items-center justify-center">
			<FlatList
				ref={flatList}
				data={readingOrder}
				keyExtractor={({ href }) => href}
				renderItem={({ item: { href }, index }) => {
					const size = getPageSize(index)

					return (
						<View
							className="flex items-center justify-center"
							style={{
								height: safeMaxHeight,
								minHeight: safeMaxHeight,
								minWidth: width,
								width: width,
							}}
						>
							<Image
								source={{
									uri: href,
									headers: {
										Authorization: sdk.authorizationHeader,
									},
								}}
								style={{
									alignSelf: 'center',
									height: size.height,
									width: size.width,
									maxWidth: width,
								}}
								onLoad={(event) => onImageLoaded(event, index)}
							/>
						</View>
					)
				}}
				pagingEnabled
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				horizontal
				initialScrollIndex={currentPage - 1}
				// https://stackoverflow.com/questions/53059609/flat-list-scrolltoindex-should-be-used-in-conjunction-with-getitemlayout-or-on
				onScrollToIndexFailed={(info) => {
					const wait = new Promise((resolve) => setTimeout(resolve, 500))
					wait.then(() => {
						flatList.current?.scrollToIndex({ index: info.index, animated: true })
					})
				}}
			/>
		</View>
	)
}
