import { FlashListRef } from '@shopify/flash-list'
import { ReadingMode } from '@stump/graphql'
import { generatePageSets, ImageBasedBookPageRef } from '@stump/sdk'
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'

import { useDisplay } from '~/lib/hooks'
import { DEFAULT_BOOK_PREFERENCES, useBookPreferences } from '~/stores/reader'

import { IImageBasedReaderContext, ImageBasedReaderContext, NextInSeriesBookRef } from './context'
import ControlsOverlay from './ControlsOverlay'
import ImageBasedReader from './ImageBasedReader'
import NextUpOverlay from './NextUpOverlay'

type Props = Omit<
	IImageBasedReaderContext,
	'currentPage' | 'flashListRef' | 'setImageSizes' | 'pageSets' | 'imageSizes'
> &
	ComponentProps<typeof ImageBasedReader> & {
		nextInSeries?: NextInSeriesBookRef | null
	}

export default function ImageBasedReaderContainer({
	initialPage,
	onPageChanged,
	nextInSeries,
	...ctx
}: Props) {
	const { height, width } = useDisplay()
	const {
		preferences: {
			incognito,
			doublePageBehavior = DEFAULT_BOOK_PREFERENCES.doublePageBehavior,
			readingMode,
			secondPageSeparate,
		},
	} = useBookPreferences({ book: ctx.book, serverId: ctx.serverId })

	const [imageSizes, setImageSizes] = useState<Record<number, ImageBasedBookPageRef>>(
		() =>
			ctx.book?.pageAnalysis?.dimensions
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
	const [showNextUp, setShowNextUp] = useState(false)

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

		return sets
	}, [doublePageBehavior, pages, imageSizes, deviceOrientation, readingMode, secondPageSeparate])

	const [currentPage, setCurrentPage] = useState(initialPage)

	const onPageChangedHandler = useCallback(
		(page: number) => {
			if (!incognito) {
				onPageChanged?.(page)
			}
			setCurrentPage(page)
		},
		[incognito, onPageChanged],
	)

	const flashListRef = useRef<FlashListRef<number[]>>(null)

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
				flashListRef,
			}}
		>
			<View className="fixed inset-0 flex-1 bg-black">
				<ControlsOverlay />

				{nextInSeries && (
					<NextUpOverlay
						isVisible={showNextUp}
						book={nextInSeries}
						onClose={() => setShowNextUp(false)}
					/>
				)}

				<ImageBasedReader
					initialPage={initialPage}
					// Note: This does not work for Android so we need an alternative solution. I'm
					// thinking maybe adding a menu entry for it in the controls overlay
					onPastEndReached={() => setShowNextUp(!!nextInSeries)}
				/>
			</View>
		</ImageBasedReaderContext.Provider>
	)
}
