import { ComponentProps, useCallback, useRef, useState } from 'react'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useBookPreferences } from '~/stores/reader'

import { IImageBasedReaderContext, ImageBasedReaderContext } from './context'
import Footer from './Footer'
import Header from './Header'
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

	return (
		<ImageBasedReaderContext.Provider
			value={{ ...ctx, currentPage, onPageChanged: onPageChangedHandler, flatListRef }}
		>
			<SafeAreaView className="flex flex-1 items-center justify-center">
				<Header />
				<ImageBasedReader initialPage={initialPage} />
				<Footer />
			</SafeAreaView>
		</ImageBasedReaderContext.Provider>
	)
}
