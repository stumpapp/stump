import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { BookMetadata, ReadiumLocator, ReadiumView, ReadiumViewRef } from '~/modules/readium'
import { useReaderStore } from '~/stores'
import { useDownload } from '~/stores/download'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'

import { EbookReaderBookRef } from '../image/context'
import ReadiumFooter, { FOOTER_HEIGHT } from './ReadiumFooter'
import ReadiumHeader, { HEADER_HEIGHT } from './ReadiumHeader'

type Props = {
	/**
	 * The book which is being read
	 */
	book: EbookReaderBookRef
	/**
	 * The initial locator to start the reader on
	 */
	initialLocator?: ReadiumLocator
	/**
	 * Whether the reader should be in incognito mode
	 */
	incognito?: boolean

	onLocationChanged: (locator: ReadiumLocator, percentage: number) => void
}

// TODO: Don't assume loading book. Intake an optional localUri which effectively unlocks offline reading
export default function ReadiumReader({
	book,
	initialLocator,
	incognito,
	onLocationChanged,
}: Props) {
	const {
		activeServer: { id },
	} = useActiveServer()
	const { downloadBook } = useDownload()

	const [localUri, setLocalUri] = useState<string | null>(null)
	const [locator, setLocator] = useState<ReadiumLocator | undefined>(() => initialLocator)

	const controlsVisible = useReaderStore((state) => state.showControls)
	const setControlsVisible = useReaderStore((state) => state.setShowControls)

	const { brightness, ...preferences } = useReaderStore((state) => ({
		fontSize: state.globalSettings.fontSize,
		fontFamily: state.globalSettings.fontFamily,
		lineHeight: state.globalSettings.lineHeight,
		brightness: state.globalSettings.brightness,
		publisherStyles: state.globalSettings.allowPublisherStyles,
	}))
	const { colors } = useEpubTheme()

	const config = useMemo(
		() => ({
			...preferences,
			colors,
		}),
		[preferences, colors],
	)

	const readerRef = useRef<ReadiumViewRef>(null)

	const navigator = useMemo(
		() =>
			({
				goToLocation: async (locator: ReadiumLocator) => {
					readerRef.current?.goToLocation(locator)
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
			}) satisfies ReadiumViewRef,
		[],
	)

	const store = useEpubLocationStore((store) => ({
		storeBook: store.storeBook,
		onTocChange: store.onTocChange,
		onBookLoad: store.onBookLoad,
		onLocationChange: store.onLocationChange,
		cleanup: store.onUnload,
		storeActions: store.storeActions,
	}))

	useEffect(() => {
		if (localUri) return

		async function download() {
			const result = await downloadBook(book)
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
			return () => {
				store.cleanup()
				setLocalUri(null)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	const handleBookLoaded = useCallback(
		(metadata?: BookMetadata) => {
			store.onBookLoad(metadata)
			store.onTocChange(book.ebook?.toc ?? [])
			store.storeBook(book)
			store.storeActions(navigator)
		},
		[store, book, navigator],
	)

	const handleLocationChanged = useCallback(
		(locator: ReadiumLocator) => {
			store.onLocationChange(locator)
			setLocator(locator)

			const totalProgression = locator.locations?.totalProgression

			if (!incognito && totalProgression != null) {
				onLocationChanged(locator, totalProgression)
			}
		},
		[onLocationChanged, incognito, store],
	)

	const handleMiddleTouch = useCallback(() => {
		setControlsVisible(!controlsVisible)
	}, [controlsVisible, setControlsVisible])

	const handleSelection = useCallback(
		(event: {
			nativeEvent: { cleared?: boolean; x?: number; y?: number; locator?: ReadiumLocator }
		}) => {
			// eslint-disable-next-line no-console
			console.log('Text selection:', event.nativeEvent)
		},
		[],
	)

	const insets = useSafeAreaInsets()

	if (!localUri) return null

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors?.background,
				filter: `brightness(${brightness * 100}%)`,
			}}
		>
			<ReadiumHeader
				settingsUrl={`/server/${id}/books/${book.id}/ebook-settings`}
				locationsUrl={`/server/${id}/books/${book.id}/ebook-locations-modal`}
			/>

			<ReadiumView
				ref={readerRef}
				bookId={book.id}
				url={localUri}
				locator={locator}
				onBookLoaded={({ nativeEvent }) => handleBookLoaded(nativeEvent.bookMetadata)}
				onLocatorChange={({ nativeEvent: locator }) => handleLocationChanged(locator)}
				onMiddleTouch={handleMiddleTouch}
				onSelection={handleSelection}
				style={{
					flex: 1,
					marginTop: insets.top + HEADER_HEIGHT,
					marginBottom: insets.bottom + FOOTER_HEIGHT,
				}}
				{...config}
			/>

			<ReadiumFooter />
		</View>
	)
}
