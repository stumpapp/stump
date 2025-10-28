import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDownload } from '~/lib/hooks'
import {
	intoPDFReadiumLocator,
	PDFBookLoadedEvent,
	PDFView,
	PDFViewRef,
	ReadiumLocator,
} from '~/modules/readium'
import { useReaderStore } from '~/stores'
import { useEpubLocationStore } from '~/stores/epub'

import { ImageReaderBookRef } from '../image/context'
import { OfflineCompatibleReader } from '../types'

type Props = {
	/**
	 * The book which is being read
	 */
	book: ImageReaderBookRef
	/**
	 * The initial page
	 */
	initialPage?: number
	/**
	 * Whether the reader should be in incognito mode
	 */
	incognito?: boolean
	/**
	 * Callback when the page changes
	 */
	onPageChanged: (page: number) => void
	/**
	 * The URI of the offline book, if available
	 */
	offlineUri?: string
} & OfflineCompatibleReader

export default function ReadiumReader({
	book,
	initialPage,
	incognito,
	onPageChanged,
	...ctx
}: Props) {
	const { downloadBook } = useDownload({ serverId: ctx.serverId })

	const [localUri, setLocalUri] = useState<string | null>(() => ctx.offlineUri || null)
	const [locator, setLocator] = useState<ReadiumLocator | undefined>(() =>
		intoPDFReadiumLocator(initialPage || 1),
	)

	const controlsVisible = useReaderStore((state) => state.showControls)
	const setControlsVisible = useReaderStore((state) => state.setShowControls)

	const { brightness } = useReaderStore((state) => ({
		brightness: state.globalSettings.brightness,
	}))

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

	const store = useEpubLocationStore((store) => ({
		storeBook: store.storeBook,
		onTocChange: store.onTocChange,
		onBookLoad: store.onBookLoad,
		onLocationChange: store.onLocationChange,
		cleanup: store.onUnload,
		storeActions: store.storeActions,
		toc: store.toc,
	}))

	useEffect(() => {
		if (localUri) return

		async function download() {
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

		download()
	}, [localUri, book, downloadBook, store])

	useEffect(
		() => {
			if (ctx.offlineUri) {
				setLocalUri(ctx.offlineUri)
			}

			return () => {
				store.cleanup()
				setLocalUri(null)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	const handleBookLoaded = useCallback(
		(metadata?: PDFBookLoadedEvent['bookMetadata']) => {
			store.onBookLoad(metadata)
			// store.onTocChange(book.ebook?.toc ?? [])
			store.storeBook(book)
			store.storeActions(navigator)
		},
		[store, book, navigator],
	)

	const handleLocationChanged = useCallback(
		(locator: ReadiumLocator) => {
			setLocator(locator)

			const page = locator.locations?.position ?? 1
			if (!incognito && page != null) {
				onPageChanged(page)
			}
		},
		[onPageChanged, incognito],
	)

	const handleMiddleTouch = useCallback(() => {
		setControlsVisible(!controlsVisible)
	}, [controlsVisible, setControlsVisible])

	const insets = useSafeAreaInsets()

	if (!localUri) return null

	return (
		<View
			style={{
				flex: 1,
				filter: `brightness(${brightness * 100}%)`,
				backgroundColor: '#000000',
			}}
		>
			{/* Header */}

			<PDFView
				ref={readerRef}
				bookId={book.id}
				url={localUri}
				locator={locator}
				onBookLoaded={({ nativeEvent }) => handleBookLoaded(nativeEvent.bookMetadata)}
				onLocatorChange={({ nativeEvent: locator }) => handleLocationChanged(locator)}
				// onMiddleTouch={handleMiddleTouch}
				// onSelection={handleSelection}
				style={{
					flex: 1,
					// marginTop: insets.top + HEADER_HEIGHT,
				}}
				scrollAxis="horizontal"
			/>

			{/* <ReadiumFooter /> */}
		</View>
	)
}
