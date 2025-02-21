import { useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useCallback, useEffect, useRef } from 'react'
import { View } from 'react-native'
import { FlatList, Pressable } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Progress, Text } from '~/components/ui'
import { useReaderStore } from '~/stores'

import { useImageBasedReader } from './context'

// TODO: https://github.com/react-native-linear-gradient/react-native-linear-gradient
// See also https://github.com/react-native-linear-gradient/react-native-linear-gradient/issues/247

export default function Footer() {
	const { sdk } = useSDK()
	const {
		book: { pages },
		pageURL,
		currentPage = 1,
		flatListRef: readerRef,
	} = useImageBasedReader()

	const ref = useRef<FlatList>(null)
	const insets = useSafeAreaInsets()
	const visible = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)

	const percentage = (currentPage / pages) * 100

	useEffect(() => {
		if (visible) {
			ref.current?.scrollToIndex({ index: currentPage - 1, animated: true, viewPosition: 0.5 })
		}
	}, [visible, currentPage])

	const getSize = useCallback(
		(idx: number) => ({
			width: idx === currentPage ? 150 : 100,
			height: idx === currentPage ? 200 : 150,
		}),
		[currentPage],
	)

	const getItemLayout = useCallback(
		(_: ArrayLike<number> | null | undefined, index: number) => ({
			length: getSize(index).width,
			offset: getSize(index).width * index,
			index,
		}),
		[getSize],
	)

	const onChangePage = useCallback(
		(page: number) => {
			setShowControls(false)
			readerRef.current?.scrollToIndex({ index: page - 1, animated: false })
		},
		[readerRef, setShowControls],
	)

	// TODO: animate
	if (!visible) {
		return null
	}

	return (
		<View
			className="absolute z-10 gap-2"
			style={{
				left: insets.left,
				right: insets.right,
				bottom: insets.bottom,
			}}
		>
			<FlatList
				ref={ref}
				data={Array.from({ length: pages }, (_, i) => i + 1)}
				keyExtractor={(item) => item.toString()}
				renderItem={({ item: page }) => (
					<View>
						<Pressable onPress={() => onChangePage(page)}>
							<View className="aspect-[2/3] overflow-hidden rounded-xl shadow-lg">
								<Image
									source={{
										uri: pageURL(page),
										headers: {
											Authorization: sdk.authorizationHeader,
										},
									}}
									cachePolicy="disk"
									style={getSize(page)}
									contentFit="contain"
								/>
							</View>
						</Pressable>

						{page !== currentPage && (
							<Text size="sm" className="shrink-0 text-center">
								{page}
							</Text>
						)}
					</View>
				)}
				contentContainerStyle={{ gap: 4, alignItems: 'flex-end' }}
				getItemLayout={getItemLayout}
				horizontal
				showsHorizontalScrollIndicator={false}
				initialScrollIndex={currentPage - 1}
				windowSize={10}
			/>

			<Progress className="h-1" value={percentage} />

			<View className="flex flex-row justify-between">
				{/* TODO: reading time */}
				<View />

				<View>
					<Text className="text-sm text-foreground-muted">
						Page {currentPage} of {pages}
					</Text>
				</View>
			</View>
		</View>
	)
}
