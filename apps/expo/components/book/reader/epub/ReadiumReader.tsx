import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FullScreenLoader } from '~/components/ui'
import { verifyFileReadable } from '~/lib/filesystem'
import { useDownload } from '~/lib/hooks'
import { BookMetadata, ReadiumLocator, ReadiumView, ReadiumViewRef } from '~/modules/readium'
import { useReaderStore } from '~/stores'
import { trimFragmentFromHref, useEpubLocationStore, useEpubTheme } from '~/stores/epub'

import { EbookReaderBookRef } from '../image/context'
import { OfflineCompatibleReader } from '../types'
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
	...ctx
}: Props) {
	const { downloadBook } = useDownload({ serverId: ctx.serverId })

	const [localUri, setLocalUri] = useState<string | null>(() => ctx.offlineUri || null)
	// const [isDownloading, setIsDownloading] = useState(false)

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
		storeHeaders: store.storeHeaders,
		toc: store.toc,
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ctx.requestHeaders],
	)

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
			if (!locator.chapterTitle) {
				const tocItem = store.toc.find(
					(item) => trimFragmentFromHref(item.content) === locator.href,
				)
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

	const headerUrls = useMemo(() => {
		const prefix = ctx.offlineUri
			? `/offline/${book.id}`
			: `/server/${ctx.serverId}/books/${book.id}`
		return {
			settingsUrl: `${prefix}/ebook-settings`,
			locationsUrl: `${prefix}/ebook-locations-modal`,
		}
	}, [ctx, book.id])

	const insets = useSafeAreaInsets()

	if (isDownloading) return <FullScreenLoader label="Downloading..." />

	if (!localUri) return null

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors?.background,
				filter: `brightness(${brightness * 100}%)`,
			}}
		>
			<ReadiumHeader {...headerUrls} />

			<ReadiumView
				ref={readerRef}
				bookId={book.id}
				url={localUri}
				initialLocator={initialLocator}
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
