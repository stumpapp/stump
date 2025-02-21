import { ComponentProps, useCallback, useRef, useState } from 'react'
import { View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useBookPreferences } from '~/stores/reader'

import { IImageBasedReaderContext, ImageBasedReaderContext } from './context'
import ControlsOverlay from './ControlsOverlay'
import ImageBasedReader from './ImageBasedReader'

type Props = Omit<IImageBasedReaderContext, 'currentPage' | 'flatListRef'> &
	ComponentProps<typeof ImageBasedReader>

// TODO: make controls a full-screen overlay to prevent scrolling etc
export default function ImageBasedReaderContainer({ initialPage, onPageChanged, ...ctx }: Props) {
	const {
		preferences: { incognito },
	} = useBookPreferences(ctx.book.id)
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
	const insets = useSafeAreaInsets()

	return (
		<ImageBasedReaderContext.Provider
			value={{ ...ctx, currentPage, onPageChanged: onPageChangedHandler, flatListRef }}
		>
			<View
				className="fixed inset-0 flex-1"
				style={{
					paddingTop: insets.top,
					paddingBottom: insets.bottom,
				}}
			>
				<ControlsOverlay />
				<ImageBasedReader initialPage={initialPage} />
			</View>
		</ImageBasedReaderContext.Provider>
	)
}
