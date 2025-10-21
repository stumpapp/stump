import { ARCHIVE_EXTENSION, EBOOK_EXTENSION } from '@stump/client'
import { PagedProgressInput } from '@stump/graphql'
import { useMutation } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo } from 'react'
import { match, P } from 'ts-pattern'
import urlJoin from 'url-join'

import { ImageBasedReader, ReadiumReader } from '~/components/book/reader'
import { ImageReaderBookRef } from '~/components/book/reader/image/context'
import { db, downloadedFiles, epubProgress, unsyncedReadProgress } from '~/db'
import { booksDirectory, thumbnailsDirectory, unpackedBookDirectory } from '~/lib/filesystem'
import { useAppState } from '~/lib/hooks'
import { intoReadiumLocator } from '~/modules/readium'
import { ReadiumLocator } from '~/modules/readium/src/Readium.types'
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
			.leftJoin(unsyncedReadProgress, eq(downloadedFiles.id, unsyncedReadProgress.bookId))
			.limit(1),
	)

	if (!record && !!updatedAt) {
		throw new Error('Downloaded file not found')
	}

	if (!record) {
		return null
	}

	return <Reader record={record} />
}

type ReaderProps = {
	record: {
		downloaded_files: typeof downloadedFiles.$inferSelect
		unsynced_read_progress: typeof unsyncedReadProgress.$inferSelect | null
	}
}
function Reader({ record }: ReaderProps) {
	const downloadedFile = useMemo(() => record.downloaded_files, [record])

	const unsyncedProgress = useMemo(() => record.unsynced_read_progress, [record])

	const extension = useMemo(
		() => downloadedFile.filename.split('.').pop()?.toLowerCase(),
		[downloadedFile.filename],
	)

	const book = useMemo(
		() => buildBook(downloadedFile, unsyncedProgress),
		[downloadedFile, unsyncedProgress],
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
				.insert(unsyncedReadProgress)
				.values({
					bookId,
					page: input.page,
					elapsedSeconds: totalSeconds,
					lastModified: new Date(),
					serverId,
				})
				.onConflictDoUpdate({
					target: unsyncedReadProgress.bookId,
					set: {
						page: input.page,
						elapsedSeconds: totalSeconds,
						lastModified: new Date(),
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
				.insert(unsyncedReadProgress)
				.values({
					bookId,
					epubProgress,
					elapsedSeconds: totalSeconds,
					percentage: percentage.toString(),
					lastModified: new Date(),
					serverId,
				})
				.onConflictDoUpdate({
					target: unsyncedReadProgress.bookId,
					set: {
						epubProgress: epubProgress,
						elapsedSeconds: totalSeconds,
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

	// TODO: Obviously wrong
	const pageURL = useCallback(
		(page: number) =>
			urlJoin(unpackedBookDirectory(downloadedFile.serverId, downloadedFile.id), `${page}.jpg`),
		[downloadedFile.serverId, downloadedFile.id],
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
				offlineUri={`${booksDirectory(downloadedFile.serverId)}/${downloadedFile.filename}`}
				serverId={downloadedFile.serverId}
			/>
		)
	} else if (extension?.match(ARCHIVE_EXTENSION)) {
		return (
			<ImageBasedReader
				initialPage={1}
				book={book}
				pageURL={pageURL}
				onPageChanged={onPageChanged}
				resetTimer={reset}
				serverId={downloadedFile.serverId}
			/>
		)
	}

	return null
}

const buildBook = (
	downloadedFile: typeof downloadedFiles.$inferSelect,
	unsyncedProgress: typeof unsyncedReadProgress.$inferSelect | null,
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

	return {
		__typename: 'Media',
		id: downloadedFile.id,
		extension,
		name: downloadedFile.bookName || downloadedFile.filename.replace(`.${extension}`, ''),
		nextInSeries: {
			nodes: [],
			__typename: 'PaginatedMediaResponse',
		},
		// TODO: Fix this
		pages: -1,
		thumbnail,
		// TODO: ebook.bookmarks and ebook.spine
		metadata: downloadedFile.bookMetadata as ImageReaderBookRef['metadata'] | undefined,
		readProgress,
	}
}
