import { ReadingMode } from '@stump/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'

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

export default function PdfReader({ book, initialPage, incognito, onPageChanged, ...ctx }: Props) {
	const { downloadBook } = useDownload({ serverId: ctx.serverId })

	const [localUri, setLocalUri] = useState<string | null>(() => ctx.offlineUri || null)
	const [locator, setLocator] = useState<PDFLocator | undefined>(() =>
		intoPDFReadiumLocator(initialPage || 1),
	)

	const controlsVisible = useReaderStore((state) => state.showControls)
	const setControlsVisible = useReaderStore((state) => state.setShowControls)

	const { brightness } = useReaderStore((state) => ({
		brightness: state.globalSettings.brightness,
	}))
	const { preferences: bookPreferences } = useBookPreferences({ book, serverId: ctx.serverId })

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
			}) satisfies PDFPreferences,
		[bookPreferences],
	)

	console.log({ config })

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
			setLocator(locator)

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

	if (!localUri) return null

	return (
		<View
			style={{
				flex: 1,
				filter: `brightness(${brightness * 100}%)`,
				backgroundColor: config.backgroundColor || '#000000',
			}}
		>
			<PdfReaderHeader serverId={ctx.serverId} />

			<ControlsBackdrop />
			<PDFView
				ref={readerRef}
				bookId={book.id}
				url={localUri}
				locator={locator}
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
	)
}
