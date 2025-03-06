import { ComponentProps, useCallback, useRef, useState } from 'react'
import { Dimensions, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useBookPreferences } from '~/stores/reader'

import { IImageBasedReaderContext, ImageBasedBookPageRef, ImageBasedReaderContext } from './context'
import ControlsOverlay from './ControlsOverlay'
import ImageBasedReader from './ImageBasedReader'

type Props = Omit<IImageBasedReaderContext, 'currentPage' | 'flatListRef' | 'setImageSizes'> &
	ComponentProps<typeof ImageBasedReader>

export default function ImageBasedReaderContainer({
	initialPage,
	onPageChanged,
	imageSizes = [],
	...ctx
}: Props) {
	const {
		preferences: { incognito },
	} = useBookPreferences(ctx.book.id)
	const [currentPage, setCurrentPage] = useState(() => initialPage)
	const [sizes, setSizes] = useState<ImageBasedBookPageRef[]>(() => imageSizes)

	const onPageChangedHandler = useCallback(
		(page: number) => {
			if (!incognito) {
				onPageChanged?.(page)
			}
			setCurrentPage(page)
		},
		[incognito, onPageChanged],
	)

	const flatListRef = useRef<FlatList>(null)
	// const flatListRef = useRef<FlashList<number>>(null)
	const insets = useSafeAreaInsets()

	// TODO: prefetch, see https://github.com/candlefinance/faster-image/issues/73
	// useEffect(
	// 	() => {
	// 		Image.prefetch([ctx.pageURL(currentPage)], {
	// 			headers: {
	// 				Authorization: sdk.authorizationHeader || '',
	// 			},
	// 		})
	// 	},
	// 	// eslint-disable-next-line react-hooks/exhaustive-deps
	// 	[initialPage],
	// )

	return (
		<ImageBasedReaderContext.Provider
			value={{
				...ctx,
				currentPage,
				onPageChanged: onPageChangedHandler,
				imageSizes: sizes,
				setImageSizes: setSizes,
				flatListRef,
			}}
		>
			<View
				className="fixed inset-0 flex-1 bg-black"
				style={{
					paddingTop: insets.top,
					paddingBottom: insets.bottom,
					height: Dimensions.get('screen').height - insets.top - insets.bottom,
				}}
			>
				<ControlsOverlay />
				<ImageBasedReader initialPage={initialPage} />
			</View>
		</ImageBasedReaderContext.Provider>
	)
}
