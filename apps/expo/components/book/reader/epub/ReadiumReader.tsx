import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FullScreenLoader } from '~/components/ui'
import { verifyFileReadable } from '~/lib/filesystem'
import { useDownload } from '~/lib/hooks'
import {
	BookLoadedEventPayload,
	ColumnCount,
	intoBookmarkRef,
	ReadiumLocator,
	ReadiumView,
	ReadiumViewRef,
} from '~/modules/readium'
import { useReaderStore } from '~/stores'
import {
	convertNativeToc,
	findTocItemByHref,
	OnBookmarkCallback,
	useEpubLocationStore,
	useEpubTheme,
} from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { EbookReaderBookRef } from '../image/context'
import { OfflineCompatibleReader } from '../types'
import CustomizeThemeSheet from './CustomizeThemeSheet'
import EpubLocationsSheet from './EpubLocationsSheet'
import EpubSettingsSheet from './EpubSettingsSheet'
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
	/**
	 * Callback when the location changes
	 */
	onLocationChanged: (locator: ReadiumLocator, percentage: number) => void
	/**
	 * The URI of the offline book, if available
	 */
	offlineUri?: string
	/**
	 * Callback to create a bookmark at the given locator
	 */
	onBookmark?: OnBookmarkCallback
	/**
	 * Callback to delete a bookmark by ID
	 */
	onDeleteBookmark?: (bookmarkId: string) => Promise<void>
} & OfflineCompatibleReader

// FIXME: There is a pretty gnarly bug for single-page EPUBs where Readium doesn't do a great job of
// reporting the location back. It manifests as the chapterTitle always being missing (and a "fix" I added
// makes it show the _first_ chapter title all the time). Need to investigate further, the only idea I've had
// is to try and detect single-page EPUBs and handle them differently (e.g., percentage or position-based tracking?)

export default function ReadiumReader({
	book,
	initialLocator,
	incognito,
	onLocationChanged,
	onBookmark,
	onDeleteBookmark,
	...ctx
}: Props) {
	const { downloadBook } = useDownload({ serverId: ctx.serverId })

	const [localUri, setLocalUri] = useState<string | null>(() => ctx.offlineUri || null)
	// const [isDownloading, setIsDownloading] = useState(false)

	const controlsVisible = useReaderStore((state) => state.showControls)
	const setControlsVisible = useReaderStore((state) => state.setShowControls)

	const {
		fontWeight: rawFontWeight,
		columnCount: rawColumnCount,
		...preferences
	} = useReaderStore((state) => ({
		fontSize: state.globalSettings.fontSize,
		fontFamily: state.globalSettings.fontFamily,
		fontWeight: state.globalSettings.fontWeight,
		lineHeight: state.globalSettings.lineHeight,
		brightness: state.globalSettings.brightness,
		publisherStyles: state.globalSettings.allowPublisherStyles,
		pageMargins: state.globalSettings.pageMargins,
		columnCount: state.globalSettings.columnCount,
		imageFilter: state.globalSettings.imageFilter,
		textAlign: state.globalSettings.textAlign,
		typeScale: state.globalSettings.typeScale,
		paragraphIndent: state.globalSettings.paragraphIndent,
		paragraphSpacing: state.globalSettings.paragraphSpacing,
		wordSpacing: state.globalSettings.wordSpacing,
		letterSpacing: state.globalSettings.letterSpacing,
		hyphens: state.globalSettings.hyphens,
		ligatures: state.globalSettings.ligatures,
		textNormalization: state.globalSettings.textNormalization,
		verticalText: state.globalSettings.verticalText,
		readingDirection: (state.globalSettings.readingDirection?.toLowerCase() === 'ltr'
			? 'ltr'
			: 'rtl') as 'ltr' | 'rtl',
	}))
	const { colors } = useEpubTheme()

	// Readium uses a scale factor  (1.0 = 400)
	const fontWeight = rawFontWeight ? rawFontWeight / 400 : undefined
	const columnCount = (rawColumnCount != null ? String(rawColumnCount) : undefined) as
		| ColumnCount
		| undefined

	const config = {
		...preferences,
		fontWeight,
		columnCount,
		colors,
	}

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
		storeHeaders: store.storeHeaders,
		toc: store.toc,
		storeBookmarks: store.storeBookmarks,
		storeOnBookmark: store.storeOnBookmark,
		storeOnDeleteBookmark: store.storeOnDeleteBookmark,
	}))

	const { isLoading: isDownloading } = useQuery({
		queryKey: ['readium-reader-offline-uri', book.id, ctx.serverId],
		enabled: !localUri,
		queryFn: async () => {
			const result = await downloadBook({
				...book,
				bookName: book.name,
				libraryId: book.library?.id,
				libraryName: book.library?.name,
				seriesId: book.series?.id,
				seriesName: book.series?.resolvedName,
				toc: book.ebook?.toc,
				readProgress: book.readProgress,
				thumbnailMeta: book.thumbnail.metadata || undefined,
			})

			if (result) {
				await verifyFileReadable(result)
				setLocalUri(result)
				return result
			} else {
				console.error('Failed to download book')
				return null
			}
		},
	})

	useEffect(
		() => {
			store.storeHeaders(ctx.requestHeaders)
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ctx.requestHeaders],
	)

	useEffect(
		() => {
			store.storeOnBookmark(onBookmark)
			store.storeOnDeleteBookmark(onDeleteBookmark)
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onBookmark, onDeleteBookmark],
	)

	useEffect(
		() => {
			const bookmarks = book.ebook?.bookmarks
			if (bookmarks) {
				store.storeBookmarks(bookmarks.map(intoBookmarkRef))
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[book.ebook?.bookmarks],
	)

	const closeAllSheets = useEpubSheetStore((state) => state.closeAllSheets)

	useEffect(
		() => {
			return () => {
				store.cleanup()
				// FIXME: Not working...
				closeAllSheets()
				setLocalUri(null)
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	const handleBookLoaded = useCallback(
		(event: BookLoadedEventPayload) => {
			store.onBookLoad(event.bookMetadata)

			// Note: This is kinda treating a symptom rather than the cause, but the server-derived ToC is less
			// accurate than Readium's for some reason. I don't have time to dig into the weeds of the epub parsing
			// library I use to sus out the cause, so for now when feasible we just defer to Readium's ToC.
			// Frankly it even makes more sense, since this is a fully encapsulated experience for mobile. I think
			// once web supports Readium then it becomes more of an important thing to figure out, since the server will
			// basically need to return something more alike what the native Readium libraries do
			if (event.tableOfContents && event.tableOfContents.length > 0) {
				store.onTocChange(convertNativeToc(event.tableOfContents), 'native')
			} else if (book.ebook?.toc && book.ebook.toc.length > 0) {
				store.onTocChange(book.ebook.toc, 'server')
			}

			store.storeBook(book)
			store.storeActions(navigator)
		},
		[store, book, navigator],
	)

	const handleLocationChanged = useCallback(
		(locator: ReadiumLocator) => {
			if (!locator.chapterTitle) {
				const tocItem = findTocItemByHref(store.toc, locator.href)
				if (tocItem) {
					locator.chapterTitle = tocItem.label
				}
			}

			store.onLocationChange(locator)

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

	if (isDownloading) return <FullScreenLoader label="Downloading..." />

	if (!localUri) return null

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors?.background,
			}}
		>
			<ReadiumHeader />

			<ReadiumView
				ref={readerRef}
				bookId={book.id}
				url={localUri}
				initialLocator={initialLocator}
				onBookLoaded={({ nativeEvent }) => handleBookLoaded(nativeEvent)}
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

			<EpubSettingsSheet />
			<EpubLocationsSheet />
			<CustomizeThemeSheet />
		</View>
	)
}
