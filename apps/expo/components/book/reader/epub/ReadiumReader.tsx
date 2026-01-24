import { useQuery } from '@tanstack/react-query'
import setProperty from 'lodash/set'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FullScreenLoader } from '~/components/ui'
import { verifyFileReadable } from '~/lib/filesystem'
import { useDownload } from '~/lib/hooks'
import {
	BookLoadedEventPayload,
	ColumnCount,
	DecoratorTapEvent,
	getPositions,
	HighlightRequestEvent,
	intoBookmarkRef,
	isLastReadiumLocator,
	NoteRequestEvent,
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
import {
	CreateAnnotationSheet,
	CreateAnnotationSheetRef,
	UpdateAnnotationSheet,
	UpdateAnnotationSheetRef,
} from './annotations'
import CustomizeThemeSheet from './CustomizeThemeSheet'
import EpubLocationsSheet from './EpubLocationsSheet'
import EpubSettingsSheet from './EpubSettingsSheet'
import ReadiumFooter, { FOOTER_HEIGHT } from './ReadiumFooter'
import ReadiumHeader, { HEADER_HEIGHT } from './ReadiumHeader'

export type OnCreateAnnotationCallback = (
	locator: ReadiumLocator,
	annotationText?: string,
) => Promise<{ id: string }>

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
	 * Callback when the user has reached the end of the book
	 */
	onReachedEnd?: (locator: ReadiumLocator) => void
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
	onCreateAnnotation?: OnCreateAnnotationCallback
	/**
	 * Callback to update an annotation's text, including highlights since they
	 * are a type of annotation
	 */
	onUpdateAnnotation?: (annotationId: string, annotationText: string | null) => Promise<void>
	onDeleteAnnotation?: (annotationId: string) => Promise<void>
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
	onReachedEnd,
	onBookmark,
	onDeleteBookmark,
	onCreateAnnotation,
	onUpdateAnnotation,
	onDeleteAnnotation,
	...ctx
}: Props) {
	const { downloadBook } = useDownload({ serverId: ctx.serverId })

	const [localUri, setLocalUri] = useState<string | null>(() => ctx.offlineUri || null)

	const controlsVisible = useReaderStore((state) => state.showControls)
	const setControlsVisible = useReaderStore((state) => state.setShowControls)

	const hasReachedEndRef = useRef(false)

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
				getSelection: async () => {
					return readerRef.current?.getSelection() ?? null
				},
				clearSelection: async () => {
					readerRef.current?.clearSelection()
				},
			}) satisfies ReadiumViewRef,
		[],
	)

	// TODO: Refactor to avoid registering callbacks. This is a bit yucky and the original reason for doing
	// is (using expo router w different screens) is no longer relevant since we have the programmatic sheets
	// instead of navigation-based ones. I figure the callbacks and less mutable state can just go into context,
	// which cuts the majority if not all the unnecessary store logic
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
		annotations: store.annotations,
		storeAnnotations: store.storeAnnotations,
		addAnnotation: store.addAnnotation,
		updateAnnotation: store.updateAnnotation,
		removeAnnotation: store.removeAnnotation,
		getAnnotation: store.getAnnotation,
		onCreateAnnotation: store.onCreateAnnotation,
		onUpdateAnnotation: store.onUpdateAnnotation,
		onDeleteAnnotation: store.onDeleteAnnotation,
		storeOnCreateAnnotation: store.storeOnCreateAnnotation,
		storeOnUpdateAnnotation: store.storeOnUpdateAnnotation,
		storeOnDeleteAnnotation: store.storeOnDeleteAnnotation,
		positions: store.positions,
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
			store.storeOnCreateAnnotation(onCreateAnnotation)
			store.storeOnUpdateAnnotation(onUpdateAnnotation)
			store.storeOnDeleteAnnotation(onDeleteAnnotation)
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onCreateAnnotation, onUpdateAnnotation, onDeleteAnnotation],
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

	const highlightColor = colors?.highlight ?? '#FFEB3B'

	useEffect(
		() => {
			const bookAnnotations = book.ebook?.annotations ?? []
			store.storeAnnotations(
				bookAnnotations.map((a) => ({
					id: a.id,
					bookId: book.id,
					locator: a.locator as ReadiumLocator,
					color: highlightColor,
					annotationText: a.annotationText ?? undefined,
					createdAt: new Date(a.createdAt),
					updatedAt: new Date(a.updatedAt),
				})),
			)
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[book.ebook?.annotations, highlightColor],
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
		async (event: BookLoadedEventPayload) => {
			store.onBookLoad(event.bookMetadata, await getPositions(book.id))

			hasReachedEndRef.current = false

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

	const controlsVisibleTimestamp = useRef(0)
	useEffect(() => {
		if (!controlsVisible) return

		controlsVisibleTimestamp.current = Date.now()

		const hideControlsTimer = setTimeout(() => {
			setControlsVisible(false)
		}, 6000)

		return () => clearTimeout(hideControlsTimer)
	}, [controlsVisible, setControlsVisible])

	const handleLocationChanged = useCallback(
		(locator: ReadiumLocator) => {
			// If we turn the page then immediately tap to show controls, handleLocationChanged hasn't run yet
			// so the controls will appear then disappear. From some testing, ~650ms was the
			// longest time I could create by turning then tapping so 800ms should be plenty of time.
			// Perhaps it should be hide when page swipe starts and also when sides are tapped
			const controlsVisibleRecentlyChanged = Date.now() - controlsVisibleTimestamp.current < 800

			if (controlsVisible && !controlsVisibleRecentlyChanged) {
				setControlsVisible(false)
			}

			if (!locator.chapterTitle) {
				const tocItem = findTocItemByHref(store.toc, locator.href)
				if (tocItem) {
					locator.chapterTitle = tocItem.label
				}
			}

			store.onLocationChange(locator)

			const totalProgression = locator.locations?.totalProgression
			const isLikelyLastLocator = isLastReadiumLocator(locator, store.positions)

			if (!hasReachedEndRef.current && !incognito && isLikelyLastLocator) {
				hasReachedEndRef.current = true
				setProperty(locator, 'locations.totalProgression', 1.0)
				onReachedEnd?.(locator)
			} else if (!incognito && totalProgression != null) {
				onLocationChanged(locator, totalProgression)
			}
		},
		[onLocationChanged, onReachedEnd, incognito, store, controlsVisible, setControlsVisible],
	)

	const handleReachedEnd = useCallback(
		(event: { nativeEvent: ReadiumLocator }) => {
			if (!hasReachedEndRef.current && !incognito) {
				hasReachedEndRef.current = true
				onReachedEnd?.(event.nativeEvent)
			}
		},
		[onReachedEnd, incognito],
	)

	const handleMiddleTouch = useCallback(() => {
		setControlsVisible(!controlsVisible)
	}, [controlsVisible, setControlsVisible])

	const createAnnotationSheetRef = useRef<CreateAnnotationSheetRef>(null)
	const updateAnnotationSheetRef = useRef<UpdateAnnotationSheetRef>(null)

	const handleHighlightRequest = useCallback(
		async (event: { nativeEvent: HighlightRequestEvent }) => {
			if (!store.onCreateAnnotation) return
			const { locator } = event.nativeEvent
			try {
				const result = await store.onCreateAnnotation(locator)
				if (result?.id) {
					store.addAnnotation({
						id: result.id,
						bookId: book.id,
						locator,
						color: highlightColor,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
				}
			} catch (error) {
				console.error('Failed to create annotation:', error)
			}
		},
		[store, book.id, highlightColor],
	)

	const handleNoteRequest = useCallback((event: { nativeEvent: NoteRequestEvent }) => {
		const { locator, text } = event.nativeEvent
		createAnnotationSheetRef.current?.open(locator, text)
	}, [])

	const handleAnnotationTap = useCallback(
		(event: { nativeEvent: DecoratorTapEvent }) => {
			const { decorationId } = event.nativeEvent
			const highlight = store.getAnnotation(decorationId)
			if (highlight) {
				updateAnnotationSheetRef.current?.open(highlight)
			}
		},
		[store],
	)

	const handleEditHighlight = useCallback(
		(event: { nativeEvent: { decorationId: string } }) => {
			const { decorationId } = event.nativeEvent
			const highlight = store.getAnnotation(decorationId)
			if (highlight) {
				updateAnnotationSheetRef.current?.open(highlight)
			}
		},
		[store],
	)

	const handleNativeDeleteAnnotation = useCallback(
		async (event: { nativeEvent: { decorationId: string } }) => {
			if (!store.onDeleteAnnotation) return
			const { decorationId } = event.nativeEvent
			try {
				await store.onDeleteAnnotation(decorationId)
				store.removeAnnotation(decorationId)
			} catch (error) {
				console.error('Failed to delete annotation:', error)
			}
		},
		[store],
	)

	const handleCreateAnnotation = useCallback(
		async (locator: ReadiumLocator, annotationText?: string) => {
			if (!store.onCreateAnnotation) return
			try {
				const result = await store.onCreateAnnotation(locator, annotationText)
				if (result?.id) {
					store.addAnnotation({
						id: result.id,
						bookId: book.id,
						locator,
						color: highlightColor,
						annotationText,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
				}
				await readerRef.current?.clearSelection()
			} catch (error) {
				console.error('Failed to create annotation:', error)
			}
		},
		[store, book.id, highlightColor],
	)

	const handleAnnotationChange = useCallback(
		async (decorationId: string, annotationText: string | undefined) => {
			if (!store.onUpdateAnnotation) return
			const existing = store.getAnnotation(decorationId)
			if (!existing) return
			try {
				await store.onUpdateAnnotation(decorationId, annotationText ?? null)
				store.updateAnnotation({
					...existing,
					annotationText,
					updatedAt: new Date(),
				})
			} catch (error) {
				console.error('Failed to update annotation:', error)
			}
		},
		[store],
	)

	const handleDeleteHighlight = useCallback(
		async (decorationId: string) => {
			if (!store.onDeleteAnnotation) return
			try {
				await store.onDeleteAnnotation(decorationId)
				store.removeAnnotation(decorationId)
			} catch (error) {
				console.error('Failed to delete annotation:', error)
			}
		},
		[store],
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
				decorations={store.annotations}
				onBookLoaded={({ nativeEvent }) => handleBookLoaded(nativeEvent)}
				onLocatorChange={({ nativeEvent: locator }) => handleLocationChanged(locator)}
				onMiddleTouch={handleMiddleTouch}
				onReachedEnd={handleReachedEnd}
				onHighlightRequest={handleHighlightRequest}
				onNoteRequest={handleNoteRequest}
				onAnnotationTap={handleAnnotationTap}
				onEditHighlight={handleEditHighlight}
				onDeleteHighlight={handleNativeDeleteAnnotation}
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

			<CreateAnnotationSheet
				ref={createAnnotationSheetRef}
				onCreateAnnotation={handleCreateAnnotation}
				onDismiss={() => readerRef.current?.clearSelection()}
			/>
			<UpdateAnnotationSheet
				ref={updateAnnotationSheetRef}
				onAnnotationChange={handleAnnotationChange}
				onDelete={handleDeleteHighlight}
			/>
		</View>
	)
}
