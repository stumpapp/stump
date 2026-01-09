import * as Sentry from '@sentry/react-native'
import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION } from '@stump/client'
import { PagedProgressInput } from '@stump/graphql'
import { useMutation } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useKeepAwake } from 'expo-keep-awake'
import { uuid } from 'expo-modules-core'
import * as NavigationBar from 'expo-navigation-bar'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { match, P } from 'ts-pattern'
import urlJoin from 'url-join'

import { ImageBasedReader, PdfReader, ReadiumReader } from '~/components/book/reader'
import { ImageReaderBookRef } from '~/components/book/reader/image/context'
import ServerErrorBoundary from '~/components/ServerErrorBoundary'
import {
	bookmarkLocations,
	bookmarks as bookmarksTable,
	db,
	downloadedFiles,
	epubProgress,
	epubToc,
	readProgress,
	syncStatus,
} from '~/db'
import {
	booksDirectory,
	ensureDirectoryExists,
	thumbnailsDirectory,
	unpackedBookDirectory,
} from '~/lib/filesystem'
import { useAppState } from '~/lib/hooks'
import { intoReadiumLocator } from '~/modules/readium'
import { ReadiumLocator } from '~/modules/readium/src/Readium.types'
import StumpStreamer from '~/modules/streamer'
import { useBookPreferences, useBookTimer, useReaderStore } from '~/stores/reader'

type Params = {
	fileId: string
}

// TODO: Follow https://github.com/dexie/Dexie.js/pull/2205

export default function Screen() {
	useKeepAwake()

	const { fileId } = useLocalSearchParams<Params>()

	const {
		data: [record],
		updatedAt,
	} = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.where(eq(downloadedFiles.id, fileId))
			.leftJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.limit(1),
		[fileId],
	)

	const { data: bookmarkRecords } = useLiveQuery(
		db.select().from(bookmarksTable).where(eq(bookmarksTable.bookId, fileId)),
		[fileId],
	)

	if (!record && !!updatedAt) {
		throw new Error('Downloaded file not found')
	}

	if (!record) {
		return null
	}

	return <Reader record={record} bookmarks={bookmarkRecords || []} />
}

type ReaderProps = {
	record: {
		downloaded_files: typeof downloadedFiles.$inferSelect
		read_progress: typeof readProgress.$inferSelect | null
	}
	bookmarks: (typeof bookmarksTable.$inferSelect)[]
}

function Reader({ record, bookmarks }: ReaderProps) {
	const downloadedFile = useMemo(() => record.downloaded_files, [record])

	const unsyncedProgress = useMemo(() => record.read_progress, [record])

	const extension = useMemo(
		() => downloadedFile.filename.split('.').pop()?.toLowerCase(),
		[downloadedFile.filename],
	)

	const book = useMemo(
		() => buildBook(downloadedFile, unsyncedProgress, bookmarks),
		[downloadedFile, unsyncedProgress, bookmarks],
	)

	const [isStreamerInitialized, setIsStreamerInitialized] = useState(false)
	const [isStreamerReady, setIsStreamerReady] = useState(false)
	const [streamerError, setStreamerError] = useState<Error | null>(null)

	const initializeStreamer = useCallback(async () => {
		const filePath = downloadedFile.uri.startsWith('file://')
			? decodeURIComponent(downloadedFile.uri.replace('file://', ''))
			: downloadedFile.uri

		const cacheDir = unpackedBookDirectory(downloadedFile.serverId, book.id)
		const cacheDirPath = cacheDir.startsWith('file://')
			? decodeURIComponent(cacheDir.replace('file://', ''))
			: cacheDir

		await ensureDirectoryExists(cacheDir)

		try {
			const { success } = await StumpStreamer.initializeBook(book.id, filePath, cacheDirPath)
			setIsStreamerReady(success)
			setIsStreamerInitialized(success)
		} catch (error) {
			Sentry.withScope((scope) => {
				scope.setTag('action', 'initialize streamer')
				scope.setExtra('bookID', book.id)
				scope.setExtra('filePath', filePath)
				scope.setExtra('cacheDirPath', cacheDirPath)
				Sentry.captureException(error)
			})
			console.error('Failed to initialize streamer:', error)
			setStreamerError(
				error instanceof Error
					? error
					: new Error('Failed to initialize streamer. Please reach out for support'),
			)
		}
	}, [book.id, downloadedFile.serverId, downloadedFile.uri])

	useEffect(
		() => {
			if (isStreamerInitialized) return

			if (book.extension.match(ARCHIVE_EXTENSION)) {
				initializeStreamer()

				return () => {
					if (isStreamerInitialized) {
						StumpStreamer.cleanupBook(book.id)
					}
				}
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isStreamerInitialized],
	)

	const {
		preferences: { trackElapsedTime },
	} = useBookPreferences({ book, serverId: downloadedFile.serverId })
	const { pause, resume, totalSeconds, isRunning, reset } = useBookTimer(book?.id || '', {
		initial: book?.readProgress?.elapsedSeconds,
		enabled: trackElapsedTime,
	})

	const { mutate: updatePagedProgress } = useMutation({
		retry: (attempts) => attempts < 3,
		onError: (error) => {
			console.error('Failed to update read progress:', error)
		},
		mutationFn: async ({
			bookId,
			serverId,
			...input
		}: PagedProgressInput & { bookId: string; serverId: string }) => {
			const result = await db
				.insert(readProgress)
				.values({
					bookId,
					page: input.page,
					elapsedSeconds: totalSeconds,
					lastModified: new Date(),
					serverId,
				})
				.onConflictDoUpdate({
					target: readProgress.bookId,
					set: {
						page: input.page,
						elapsedSeconds: totalSeconds,
						lastModified: new Date(),
						syncStatus: syncStatus.enum.UNSYNCED,
					},
				})
				.returning()

			return result
		},
	})

	const onPageChanged = useCallback(
		(page: number) => {
			updatePagedProgress({ bookId: book.id, serverId: downloadedFile.serverId, page })
		},
		[book.id, downloadedFile.serverId, updatePagedProgress],
	)

	const { mutate: updateEbookProgress } = useMutation({
		retry: (attempts) => attempts < 3,
		onError: (error) => {
			console.error('Failed to update read progress:', error)
		},
		mutationFn: async ({
			bookId,
			serverId,
			percentage,
			...epubProgress
		}: ReadiumLocator & { bookId: string; serverId: string; percentage: number }) => {
			const result = await db
				.insert(readProgress)
				.values({
					bookId,
					epubProgress,
					elapsedSeconds: totalSeconds,
					percentage: percentage.toString(),
					lastModified: new Date(),
					serverId,
				})
				.onConflictDoUpdate({
					target: readProgress.bookId,
					set: {
						epubProgress: epubProgress,
						elapsedSeconds: totalSeconds,
						percentage: percentage.toString(),
						syncStatus: syncStatus.enum.UNSYNCED,
						lastModified: new Date(),
					},
				})
				.returning()

			return result
		},
	})

	const onLocationChanged = useCallback(
		(locator: ReadiumLocator, percentage: number) => {
			updateEbookProgress({
				bookId: book.id,
				serverId: downloadedFile.serverId,
				percentage,
				...locator,
			})
		},
		[book.id, downloadedFile.serverId, updateEbookProgress],
	)

	const { mutateAsync: createBookmark } = useMutation({
		mutationFn: async ({
			locator,
			previewContent,
		}: {
			locator: ReadiumLocator
			previewContent?: string
		}) => {
			const id = uuid.v4()
			await db.insert(bookmarksTable).values({
				id,
				bookId: book.id,
				serverId: downloadedFile.serverId,
				href: locator.href,
				chapterTitle: locator.chapterTitle,
				epubcfi: locator.locations?.partialCfi,
				locations: locator.locations,
				previewContent,
				syncStatus: syncStatus.enum.UNSYNCED,
			})
			return { id }
		},
		onError: (error) => {
			console.error('Failed to create offline bookmark:', error)
		},
	})

	const { mutateAsync: deleteOfflineBookmark } = useMutation({
		mutationFn: async (bookmarkId: string) => {
			await db.delete(bookmarksTable).where(eq(bookmarksTable.id, bookmarkId))
		},
		onError: (error) => {
			console.error('Failed to delete offline bookmark:', error)
		},
	})

	const onBookmark = useCallback(
		async (locator: ReadiumLocator, previewContent?: string) => {
			return createBookmark({ locator, previewContent })
		},
		[createBookmark],
	)

	const onDeleteBookmark = useCallback(
		async (bookmarkId: string) => {
			await deleteOfflineBookmark(bookmarkId)
		},
		[deleteOfflineBookmark],
	)

	const pageURL = useCallback(
		(page: number) => StumpStreamer.getPageURL(book.id, page) || '',
		[book.id],
	)

	const setIsReading = useReaderStore((state) => state.setIsReading)
	const setShowControls = useReaderStore((state) => state.setShowControls)
	useEffect(
		() => {
			setIsReading(true)
			NavigationBar.setVisibilityAsync('hidden')
			return () => {
				setIsReading(false)
				setShowControls(false)
				NavigationBar.setVisibilityAsync('visible')
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	const onFocusedChanged = useCallback(
		(focused: boolean) => {
			if (!focused) {
				pause()
			} else if (focused) {
				resume()
			}
		},
		[pause, resume],
	)

	const appState = useAppState({
		onStateChanged: onFocusedChanged,
	})
	const showControls = useReaderStore((state) => state.showControls)
	useEffect(() => {
		if ((showControls && isRunning) || appState !== 'active') {
			pause()
		} else if (!showControls && !isRunning && appState === 'active') {
			resume()
		}
	}, [showControls, pause, resume, isRunning, appState])

	if (extension?.match(EBOOK_EXTENSION)) {
		const initialLocator = book.readProgress?.locator || undefined

		return (
			<ReadiumReader
				book={book}
				initialLocator={initialLocator ? intoReadiumLocator(initialLocator) : undefined}
				onLocationChanged={onLocationChanged}
				onBookmark={onBookmark}
				onDeleteBookmark={onDeleteBookmark}
				offlineUri={`${booksDirectory(downloadedFile.serverId)}/${downloadedFile.filename}`}
				serverId={downloadedFile.serverId}
			/>
		)
	} else if (extension?.match(ARCHIVE_EXTENSION)) {
		if (!isStreamerReady && streamerError) {
			return <ServerErrorBoundary error={streamerError} />
		}

		if (!isStreamerReady) return null

		return (
			<ImageBasedReader
				initialPage={book.readProgress?.page || 1}
				book={book}
				pageURL={pageURL}
				onPageChanged={onPageChanged}
				resetTimer={reset}
				serverId={downloadedFile.serverId}
			/>
		)
	} else if (extension?.match(PDF_EXTENSION)) {
		return (
			<PdfReader
				book={book}
				onPageChanged={onPageChanged}
				offlineUri={`${booksDirectory(downloadedFile.serverId)}/${downloadedFile.filename}`}
				initialPage={book.readProgress?.page || 1}
				resetTimer={reset}
				serverId={downloadedFile.serverId}
			/>
		)
	}

	return null
}

const buildBook = (
	downloadedFile: typeof downloadedFiles.$inferSelect,
	unsyncedProgress: typeof readProgress.$inferSelect | null,
	bookmarkRecords: (typeof bookmarksTable.$inferSelect)[] = [],
): ImageReaderBookRef => {
	const thumbnail = {
		// TODO: Don't assume JPG
		url: urlJoin(thumbnailsDirectory(downloadedFile.serverId), downloadedFile.id + '.jpg'),
	}

	const extension = downloadedFile.filename.split('.').pop() || ''

	const readProgress: ImageReaderBookRef['readProgress'] | undefined = match(unsyncedProgress)
		.with(
			{ page: P.number },
			(progress) =>
				({
					__typename: 'ActiveReadingSession' as const,
					page: progress.page,
					elapsedSeconds: progress.elapsedSeconds,
					percentageCompleted: progress.percentage,
				}) satisfies ImageReaderBookRef['readProgress'],
		)
		.with(
			{
				epubProgress: P.not(P.nullish),
			},
			(progress) => {
				const parsedData = epubProgress.safeParse(progress.epubProgress)
				if (!parsedData.success) {
					return undefined
				}
				const epubData = parsedData.data

				return {
					__typename: 'ActiveReadingSession' as const,
					locator: {
						__typename: 'ReadiumLocator',
						...epubData,
					},
					elapsedSeconds: progress.elapsedSeconds,
					percentageCompleted: progress.percentage,
				} satisfies ImageReaderBookRef['readProgress']
			},
		)
		.otherwise(() => undefined)

	const bookmarks = bookmarkRecords.map((b) => ({
		id: b.id,
		epubcfi: b.epubcfi,
		mediaId: b.bookId,
		previewContent: b.previewContent,
		locator: {
			chapterTitle: b.chapterTitle ?? '',
			href: b.href,
			locations: bookmarkLocations.safeParse(b.locations).data,
		},
	}))

	return {
		__typename: 'Media',
		id: downloadedFile.id,
		extension,
		name: downloadedFile.bookName || downloadedFile.filename.replace(`.${extension}`, ''),
		nextInSeries: {
			nodes: [],
			__typename: 'PaginatedMediaResponse',
		},
		pages: downloadedFile.pages ?? 0,
		thumbnail,
		metadata: downloadedFile.bookMetadata as ImageReaderBookRef['metadata'] | undefined,
		readProgress,
		ebook: extension.match(EBOOK_EXTENSION)
			? {
					toc: epubToc.safeParse(downloadedFile.toc).data || [],
					spine: [],
					bookmarks,
				}
			: undefined,
	}
}
