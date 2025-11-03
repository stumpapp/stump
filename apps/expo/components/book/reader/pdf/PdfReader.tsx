import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'

import { FullScreenLoader } from '~/components/ui'
import { useDownload } from '~/lib/hooks'
import {
	intoPDFReadiumLocator,
	PDFBookLoadedEvent,
	PDFLocator,
	PDFPreferences,
	PDFView,
	PDFViewRef,
	ReadiumLocator,
} from '~/modules/readium'
import { useReaderStore } from '~/stores'
import { usePdfStore } from '~/stores/pdf'
import { useBookPreferences } from '~/stores/reader'

import { ReaderBookRef } from '../image/context'
import { ControlsBackdrop } from '../shared'
import { OfflineCompatibleReader } from '../types'
import { PdfReaderContext } from './context'
import { PdfReaderFooter } from './PdfReaderFooter'
import { PdfReaderHeader } from './PdfReaderHeader'

type Props = {
	/**
	 * The book which is being read
	 */
	book: ReaderBookRef
	/**
	 * The initial page
	 */
	initialPage?: number
	/**
	 * Callback when the page changes
	 */
	onPageChanged: (page: number) => void
	/**
	 * The URI of the offline book, if available
	 */
	offlineUri?: string
	/**
	 * A callback to reset the reading timer
	 */
	resetTimer?: () => void
} & OfflineCompatibleReader

// TODO(expo-pdf): Long term, consider just using a library like https://github.com/wonday/react-native-pdf
// This was mostly an experiment for me to continue practicing swift/kotlin interop with expo. There are some
// benefits to using readium (e.g., potential audiobook overaly support, consistent locator format, etc) but
// it does just mean another native module to maintain.

// TODO(expo-pdf): In the meantime re: ^, I should at least add:
// - settings sheet, a chunk of existing settings do not apply to PDF

export default function PdfReader({ book, initialPage, onPageChanged, ...ctx }: Props) {
	const { downloadBook } = useDownload({ serverId: ctx.serverId })

	const [localUri, setLocalUri] = useState<string | null>(() => ctx.offlineUri || null)
	const [isDownloading, setIsDownloading] = useState(false)

	const incognito = useReaderStore((state) => state.globalSettings.incognito)

	// TODO(readium): I think I'll need to do the same thing for the ebook reader once I enable scrolling
	// Note: We don't track the locator throughout reading here because when `scroll` is enabled the change
	// in the prop triggers a snap to the locator which interrupts the scrolling experience. There really isn't
	// a need for the React side to manage the locator into the native module, it manages that itself
	const initialLocator = useMemo(() => intoPDFReadiumLocator(initialPage || 1), [initialPage])

	const controlsVisible = useReaderStore((state) => state.showControls)
	const setControlsVisible = useReaderStore((state) => state.setShowControls)

	const { brightness } = useReaderStore((state) => ({
		brightness: state.globalSettings.brightness,
	}))
	const { preferences: bookPreferences } = useBookPreferences({ book, serverId: ctx.serverId })

	// TODO(expo-pdf): Additional PDFPreferences to consider exposing:
	// - offsetFirstPage - Stump has secondPageSeparate but not first page. Might be nice to see if readium would accept something like offsetLeadingPages: Int? and offsetTrailingPages: Int?
	// - pageSpacing - "Spacing between pages in points."
	// - visibleScrollbar - Currently I just hardcode to false
	const config = useMemo(
		() =>
			({
				scrollAxis:
					bookPreferences.readingMode === ReadingMode.ContinuousVertical
						? 'vertical'
						: 'horizontal',
				scroll: bookPreferences.readingMode !== ReadingMode.Paged,
				// TODO(pdf): Implement this preference
				backgroundColor: '#000000',
				readingProgression:
					bookPreferences.readingDirection === ReadingDirection.Rtl ? 'rtl' : 'ltr',
				spread:
					bookPreferences.doublePageBehavior === 'off'
						? 'never' // Stump uses 'off' readium uses 'never' but same otherwsie
						: bookPreferences.doublePageBehavior,
			}) satisfies PDFPreferences,
		[bookPreferences],
	)

	const readerRef = useRef<PDFViewRef>(null)

	const navigator = useMemo(
		() =>
			({
				goToLocation: async (locator: ReadiumLocator) => {
					readerRef.current?.goToLocation(locator)
				},
				goToPage: async (page: number) => {
					readerRef.current?.goToPage(page)
				},
				goForward: async () => {
					readerRef.current?.goForward()
				},
				goBackward: async () => {
					readerRef.current?.goBackward()
				},
				destroy: async () => {
					readerRef.current?.destroy()
				},
			}) satisfies PDFViewRef,
		[],
	)

	const store = usePdfStore((store) => ({
		storeBook: store.storeBook,
		resetStore: store.resetStore,
		storeActions: store.storeActions,
		setCurrentPage: store.setCurrentPage,
		onLoaded: store.onLoaded,
	}))

	useEffect(() => {
		if (localUri) return

		async function download() {
			setIsDownloading(true)
			const result = await downloadBook({
				...book,
				bookName: book.name,
				libraryId: book.library?.id,
				libraryName: book.library?.name,
				seriesId: book.series?.id,
				seriesName: book.series?.resolvedName,
				readProgress: book.readProgress,
			})

			if (result) {
				setLocalUri(result)
			} else {
				console.error('Failed to download book')
			}
		}

		download().finally(() => setIsDownloading(false))
	}, [localUri, book, downloadBook, store])

	useEffect(
		() => {
			if (ctx.offlineUri) {
				setLocalUri(ctx.offlineUri)
			}

			return () => {
				store.resetStore()
				setLocalUri(null)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	useEffect(
		() => {
			store.storeBook(book)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[book.id],
	)

	const handleBookLoaded = useCallback(
		(loadEvent: PDFBookLoadedEvent) => {
			store.onLoaded(loadEvent)
			store.storeActions(navigator)
		},
		[store, navigator],
	)

	const handleLocationChanged = useCallback(
		(locator: PDFLocator) => {
			const page = locator.locations?.position ?? 1
			if (page != null) {
				store.setCurrentPage(page)
				if (!incognito) {
					onPageChanged(page)
				}
			}
		},
		[onPageChanged, incognito, store],
	)

	const handleMiddleTouch = useCallback(
		() => setControlsVisible(!controlsVisible),
		[controlsVisible, setControlsVisible],
	)

	if (isDownloading) return <FullScreenLoader label="Downloading..." />

	if (!localUri) return null

	return (
		<PdfReaderContext.Provider value={ctx}>
			<View
				style={{
					flex: 1,
					filter: `brightness(${brightness * 100}%)`,
					backgroundColor: config.backgroundColor || '#000000',
				}}
			>
				<PdfReaderHeader />

				<ControlsBackdrop />

				<PDFView
					ref={readerRef}
					bookId={book.id}
					url={localUri}
					initialLocator={initialLocator}
					onBookLoaded={({ nativeEvent: loadEvent }) => handleBookLoaded(loadEvent)}
					onLocatorChange={({ nativeEvent: locator }) => handleLocationChanged(locator)}
					onMiddleTouch={handleMiddleTouch}
					style={{
						flex: 1,
					}}
					{...config}
				/>

				<PdfReaderFooter />
			</View>
		</PdfReaderContext.Provider>
	)
}
