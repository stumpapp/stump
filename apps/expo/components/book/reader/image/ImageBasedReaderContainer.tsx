import { generatePageSets } from '@stump/sdk'
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react'
import { Dimensions, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'
import { useBookPreferences } from '~/stores/reader'

import { IImageBasedReaderContext, ImageBasedReaderContext } from './context'
import ControlsOverlay from './ControlsOverlay'
import ImageBasedReader from './ImageBasedReader'
import { useDimensions } from './useDimensions'

type Props = Omit<
	IImageBasedReaderContext,
	'currentPage' | 'flatListRef' | 'setImageSizes' | 'pageSets'
> &
	ComponentProps<typeof ImageBasedReader>

export default function ImageBasedReaderContainer({
	initialPage,
	onPageChanged,
	imageSizes,
	...ctx
}: Props) {
	const { height, width } = useDisplay()
	const {
		preferences: { incognito, doublePageBehavior = 'auto', readingMode },
	} = useBookPreferences(ctx.book.id)
	const { sizes, setSizes } = useDimensions({
		bookID: ctx.book.id,
		imageSizes,
	})

	const deviceOrientation = useMemo(
		() => (width > height ? 'landscape' : 'portrait'),
		[width, height],
	)

	const pages = ctx.book.pages
	const pageSets = useMemo(() => {
		const autoButOff = doublePageBehavior === 'auto' && deviceOrientation === 'portrait'
		const modeForceOff = readingMode === 'continuous:vertical'
		if (doublePageBehavior === 'off' || autoButOff || modeForceOff) {
			return Array.from({ length: pages }, (_, i) => [i])
		}
		return generatePageSets({ imageSizes: sizes, pages: pages })
	}, [doublePageBehavior, pages, sizes, deviceOrientation, readingMode])

	const [currentPage, setCurrentPage] = useState(() => initialPage)

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
				pageSets,
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
