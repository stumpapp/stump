import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { generatePageSets, ImageBasedBookPageRef } from '@stump/sdk'
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react'
import { Dimensions, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'
import { DEFAULT_BOOK_PREFERENCES, useBookPreferences } from '~/stores/reader'

import { IImageBasedReaderContext, ImageBasedReaderContext } from './context'
import ControlsOverlay from './ControlsOverlay'
import ImageBasedReader from './ImageBasedReader'

type Props = Omit<
	IImageBasedReaderContext,
	'currentPage' | 'flatListRef' | 'setImageSizes' | 'pageSets' | 'imageSizes'
> &
	ComponentProps<typeof ImageBasedReader>

export default function ImageBasedReaderContainer({ initialPage, onPageChanged, ...ctx }: Props) {
	const { height, width } = useDisplay()
	const {
		preferences: {
			incognito,
			doublePageBehavior = DEFAULT_BOOK_PREFERENCES.doublePageBehavior,
			readingMode,
			readingDirection,
			secondPageSeparate,
		},
	} = useBookPreferences({ book: ctx.book })

	const [imageSizes, setImageSizes] = useState<Record<number, ImageBasedBookPageRef>>(
		() =>
			ctx.book?.metadata?.pageAnalysis?.dimensions
				?.map(({ height, width }) => ({
					height,
					width,
					ratio: width / height,
				}))
				.reduce(
					(acc, ref, index) => {
						acc[index] = ref
						return acc
					},
					{} as Record<number, { height: number; width: number; ratio: number }>,
				) ?? {},
	)

	const deviceOrientation = useMemo(
		() => (width > height ? 'landscape' : 'portrait'),
		[width, height],
	)

	const pages = ctx.book.pages
	const pageSets = useMemo(() => {
		const autoButOff = doublePageBehavior === 'auto' && deviceOrientation === 'portrait'
		const modeForceOff = readingMode === ReadingMode.ContinuousVertical

		let sets: number[][] = []
		if (doublePageBehavior === 'off' || autoButOff || modeForceOff) {
			sets = Array.from({ length: pages }, (_, i) => [i])
		} else {
			sets = generatePageSets({
				imageSizes,
				pages: pages,
				secondPageSeparate: secondPageSeparate,
			})
		}

		if (readingDirection === ReadingDirection.Rtl) {
			return [...sets.map((set) => [...set].reverse())].reverse()
		}

		return sets
	}, [
		doublePageBehavior,
		pages,
		imageSizes,
		deviceOrientation,
		readingMode,
		readingDirection,
		secondPageSeparate,
	])

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
				imageSizes,
				setImageSizes,
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
