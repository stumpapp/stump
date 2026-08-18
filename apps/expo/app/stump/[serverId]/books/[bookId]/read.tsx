import {
	ARCHIVE_EXTENSION,
	EBOOK_EXTENSION,
	parseGraphQLDateTime,
	PDF_EXTENSION,
	useGraphQLMutation,
	useSDK,
	useSuspenseGraphQL,
} from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import {
	ImageBasedReader,
	PdfReader,
	ReadiumReader,
	UnsupportedReader,
} from '~/components/book/reader'
import { NextInSeriesBookRef } from '~/components/book/reader/image/context'
import { db, downloadedFiles } from '~/db'
import { booksDirectory } from '~/lib/filesystem'
import {
	useReadingTimer,
	useSyncOnlineToOfflineAnnotations,
	useSyncOnlineToOfflineBookmarks,
	useSyncOnlineToOfflineProgress,
} from '~/lib/hooks'
import { intoReadiumLocator, ReadiumLocator } from '~/modules/readium'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

export const query = graphql(`
	query BookReadScreen($id: ID!) {
		mediaById(id: $id) {
			id
			name: resolvedName
			pages
			extension
			thumbnail {
				url
				metadata {
					averageColor
					thumbhash
					colors {
						color
						percentage
					}
				}
			}
			readProgress {
				percentageCompleted
				epubcfi
				locator {
					chapterTitle
					href
					title
					locations {
						fragments
						progression
						position
						totalProgression
						cssSelector
						partialCfi
					}
					# FIXME: This caused the book to restart when selected...
					# text {
					# 	after
					# 	before
					# 	highlight
					# }
					type
				}
				page
				elapsedSeconds
			}
			series {
				id
				resolvedName
			}
			library {
				id
				name
			}
			libraryConfig {
				defaultReadingImageScaleFit
				defaultReadingMode
				defaultReadingDir
			}
			metadata {
				writers
				publisher
				summary
			}
			analysisData {
				dimensions {
					height
					width
				}
			}
			nextInSeries(pagination: { cursor: { limit: 1 } }) {
				nodes {
					id
					name: resolvedName
					thumbnail {
						url
					}
				}
			}
			ebook {
				bookmarks {
					id
					epubcfi
					mediaId
					previewContent
					locator {
						chapterTitle
						href
						locations {
							fragments
							progression
							position
							totalProgression
							cssSelector
							partialCfi
						}
					}
					createdAt
				}
				annotations {
					id
					annotationText
					createdAt
					updatedAt
					locator {
						chapterTitle
						href
						title
						type
						locations {
							fragments
							progression
							position
							totalProgression
							cssSelector
							partialCfi
						}
						text {
							after
							before
							highlight
						}
					}
				}
				spine {
					id
					idref
					properties
					linear
				}
				toc
			}
		}
	}
`)

const mutation = graphql(`
	mutation UpdateReadProgression($id: ID!, $input: MediaProgressInput!) {
		updateMediaProgress(id: $id, input: $input) {
			id
			updatedAt
		}
	}
`)

const resetElapsedSecondsMutation = graphql(`
	mutation ResetElapsedSeconds($id: ID!) {
		resetElapsedSeconds(id: $id)
	}
`)

const createBookmarkMutation = graphql(`
	mutation CreateBookmarkMobile($input: BookmarkInput!) {
		createBookmark(input: $input) {
			id
			epubcfi
			previewContent
			mediaId
			locator {
				chapterTitle
				href
				locations {
					fragments
					progression
					position
					totalProgression
					cssSelector
					partialCfi
				}
			}
		}
	}
`)

const deleteBookmarkMutation = graphql(`
	mutation DeleteBookmarkMobile($id: String!) {
		deleteBookmark(id: $id) {
			id
		}
	}
`)

const createAnnotationMutation = graphql(`
	mutation CreateAnnotationMobile($input: CreateAnnotationInput!) {
		createAnnotation(input: $input) {
			id
			annotationText
			createdAt
			updatedAt
			locator {
				chapterTitle
				href
				title
				type
				locations {
					fragments
					progression
					position
					totalProgression
					cssSelector
					partialCfi
				}
				text {
					after
					before
					highlight
				}
			}
		}
	}
`)

const updateAnnotationMutation = graphql(`
	mutation UpdateAnnotationMobile($input: UpdateAnnotationInput!) {
		updateAnnotation(input: $input) {
			id
			annotationText
			updatedAt
		}
	}
`)

const deleteAnnotationMutation = graphql(`
	mutation DeleteAnnotationMobile($id: String!) {
		deleteAnnotation(id: $id) {
			id
		}
	}
`)

type Params = {
	bookId: string
}

// TODO(reading): support incognito, not using it here lol

export default function Screen() {
	useKeepAwake()

	const { bookId } = useLocalSearchParams<Params>()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const { sdk } = useSDK()
	const {
		data: { mediaById: book },
	} = useSuspenseGraphQL(query, ['readBook', bookId], {
		id: bookId,
	})
	const queryClient = useQueryClient()

	const preferNativePdfReader = usePreferencesStore((store) => Boolean(store.preferNativePdf))

	if (!book) {
		throw new Error('Book not found')
	}

	// TODO: Swap to suspense when available
	const {
		data: [record],
		updatedAt,
	} = useLiveQuery(
		db.select().from(downloadedFiles).where(eq(downloadedFiles.id, book.id)).limit(1),
		[book.id],
	)
	const isLoadingRecord = updatedAt == null

	const nextInSeries = useMemo(() => {
		const next = book.nextInSeries.nodes.at(0)
		if (!next) return null
		return {
			id: next.id,
			name: next.name,
			thumbnailUrl: next.thumbnail.url,
		} satisfies NextInSeriesBookRef
	}, [book.nextInSeries.nodes])

	const {
		preferences: { trackElapsedTime },
	} = useBookPreferences({ book })

	const timer = useReadingTimer({
		databaseSeconds: book.readProgress?.elapsedSeconds,
		enabled: trackElapsedTime,
	})

	// tracks the last synced locator so that on exit we can send a final update so timer progression
	// is not lost if the page did not change
	const lastSyncedReadiumLocator = useRef(
		book.readProgress?.locator ? intoReadiumLocator(book.readProgress.locator) : undefined,
	)
	const lastSyncedImageReaderPage = useRef(book.readProgress?.page)

	const { syncProgress } = useSyncOnlineToOfflineProgress({ bookId: book.id, serverId })

	const { mutate: updateProgress } = useGraphQLMutation(mutation, {
		retry: (attempts) => attempts < 3,
		throwOnError: false,
		onError: (error) => {
			console.error('Failed to update read progress:', error)
		},
		onSuccess: (data, { input: onlineProgress }) => {
			if (onlineProgress.epub?.locator?.readium) {
				lastSyncedReadiumLocator.current = intoReadiumLocator({
					...onlineProgress.epub.locator.readium,
					chapterTitle: onlineProgress.epub.locator.readium.chapterTitle || '',
					type: onlineProgress.epub.locator.readium.type || 'application/xhtml+xml',
				})
			}
			if (onlineProgress.paged?.page) {
				lastSyncedImageReaderPage.current = onlineProgress.paged.page
			}

			// invalidate but do not refetch
			queryClient.invalidateQueries({ queryKey: ['bookById', bookId], exact: false })
			queryClient.invalidateQueries({ queryKey: ['readBook', bookId], exact: false })
			// TODO: Consider a preference to disable online-to-offline sync?
			syncProgress(onlineProgress, {
				updatedAt: parseGraphQLDateTime(data.updateMediaProgress.updatedAt),
				sessionId: data.updateMediaProgress.id,
			})
		},
	})

	const onPageChanged = useCallback(
		(page: number) => {
			const delta = timer.popDeltaSeconds()

			updateProgress({
				id: book.id,
				input: {
					paged: {
						page,
						elapsedSecondsDelta: delta > 0 ? delta : undefined,
					},
				},
			})
		},
		[book.id, timer, updateProgress],
	)

	const onLocationChanged = useCallback(
		(locator: ReadiumLocator, percentage: number) => {
			const delta = timer.popDeltaSeconds()

			updateProgress({
				id: book.id,
				input: {
					epub: {
						locator: {
							readium: {
								chapterTitle: locator.chapterTitle,
								href: locator.href,
								locations: locator.locations,
								text: locator.text,
								title: locator.title,
								type: locator.type || 'application/xhtml+xml',
							},
						},
						elapsedSecondsDelta: delta > 0 ? delta : undefined,
						percentage,
						isComplete: false,
					},
				},
			})
		},
		[book.id, timer, updateProgress],
	)

	const onReachedEnd = useCallback(
		(locator: ReadiumLocator) => {
			const delta = timer.popDeltaSeconds()

			updateProgress({
				id: book.id,
				input: {
					epub: {
						locator: {
							readium: {
								chapterTitle: locator.chapterTitle,
								href: locator.href,
								locations: locator.locations,
								text: locator.text,
								title: locator.title,
								type: locator.type || 'application/xhtml+xml',
							},
						},
						elapsedSecondsDelta: delta > 0 ? delta : undefined,
						isComplete: true,
					},
				},
			})
		},
		[book.id, timer, updateProgress],
	)

	const { mutate: resetElapsedSeconds } = useGraphQLMutation(resetElapsedSecondsMutation, {
		onError: (error) => {
			console.error('Failed to reset elapsed seconds:', error)
		},
		onSuccess: timer.clearTotalSeconds,
	})

	const resetTimer = useCallback(() => {
		resetElapsedSeconds({ id: book.id })
	}, [resetElapsedSeconds, book.id])

	const { syncCreate: syncBookmarkCreate, syncDelete: syncBookmarkDelete } =
		useSyncOnlineToOfflineBookmarks({
			bookId: book.id,
			serverId,
		})

	const { mutateAsync: createBookmark } = useGraphQLMutation(createBookmarkMutation, {
		onError: (error) => {
			console.error('Failed to create bookmark:', error)
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['readBook', book.id] })
			const { id, locator, previewContent } = data.createBookmark
			if (locator) {
				syncBookmarkCreate(
					id,
					{
						...locator,
						type: 'application/xhtml+xml',
					},
					previewContent,
				)
			}
		},
	})

	const { mutateAsync: deleteBookmark } = useGraphQLMutation(deleteBookmarkMutation, {
		onError: (error) => {
			console.error('Failed to delete bookmark:', error)
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['readBook', book.id] })
			syncBookmarkDelete(data.deleteBookmark.id)
		},
	})

	const onBookmark = useCallback(
		async (locator: ReadiumLocator, previewContent?: string) => {
			const result = await createBookmark({
				input: {
					mediaId: book.id,
					locator: {
						readium: {
							chapterTitle: locator.chapterTitle,
							href: locator.href,
							locations: locator.locations,
							text: locator.text,
							title: locator.title,
							type: locator.type || 'application/xhtml+xml',
						},
					},
					previewContent,
				},
			})
			return { id: result.createBookmark.id }
		},
		[book.id, createBookmark],
	)

	const onDeleteBookmark = useCallback(
		async (bookmarkId: string) => {
			await deleteBookmark({ id: bookmarkId })
		},
		[deleteBookmark],
	)

	const { syncCreate, syncUpdate, syncDelete } = useSyncOnlineToOfflineAnnotations({
		bookId: book.id,
		serverId,
	})

	const { mutateAsync: createAnnotation } = useGraphQLMutation(createAnnotationMutation, {
		onError: (error) => {
			console.error('Failed to create annotation:', error)
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['readBook', book.id] })
			const { id, locator, annotationText } = data.createAnnotation
			syncCreate(id, intoReadiumLocator(locator), annotationText)
		},
	})

	const { mutateAsync: updateAnnotation } = useGraphQLMutation(updateAnnotationMutation, {
		onError: (error) => {
			console.error('Failed to update annotation:', error)
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['readBook', book.id] })
			syncUpdate(data.updateAnnotation.id, data.updateAnnotation.annotationText ?? null)
		},
	})

	const { mutateAsync: deleteAnnotation } = useGraphQLMutation(deleteAnnotationMutation, {
		onError: (error) => {
			console.error('Failed to delete annotation:', error)
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['readBook', book.id] })
			syncDelete(data.deleteAnnotation.id)
		},
	})

	const onCreateAnnotation = useCallback(
		async (locator: ReadiumLocator, annotationText?: string) => {
			const result = await createAnnotation({
				input: {
					mediaId: book.id,
					locator: {
						chapterTitle: locator.chapterTitle ?? '',
						href: locator.href,
						title: locator.title,
						type: locator.type || 'application/xhtml+xml',
						locations: locator.locations,
						text: locator.text,
					},
					annotationText,
				},
			})
			return { id: result.createAnnotation.id }
		},
		[book.id, createAnnotation],
	)

	const onUpdateAnnotation = useCallback(
		async (annotationId: string, annotationText: string | null) => {
			await updateAnnotation({
				input: {
					id: annotationId,
					annotationText,
				},
			})
		},
		[updateAnnotation],
	)

	const onDeleteAnnotation = useCallback(
		async (annotationId: string) => {
			await deleteAnnotation({ id: annotationId })
		},
		[deleteAnnotation],
	)

	const setIsReading = useReaderStore((state) => state.setIsReading)
	useEffect(() => {
		setIsReading(true)
		return () => {
			setIsReading(false)
		}
	}, [setIsReading])

	const setShowControls = useReaderStore((state) => state.setShowControls)
	useEffect(() => {
		return () => {
			setShowControls(false)
		}
	}, [setShowControls])

	const onExitReader = useCallback(async () => {
		// update progress first so refetch picks up changes
		if (lastSyncedReadiumLocator.current) {
			onLocationChanged(
				lastSyncedReadiumLocator.current,
				lastSyncedReadiumLocator.current.locations?.totalProgression ?? 0,
			)
		}

		if (lastSyncedImageReaderPage.current) {
			onPageChanged(lastSyncedImageReaderPage.current)
		}

		await Promise.all([
			queryClient.refetchQueries({ queryKey: ['bookById', bookId], exact: false }),
			queryClient.refetchQueries({ queryKey: ['readBook', bookId], exact: false }),
			queryClient.refetchQueries({ queryKey: ['continueReading'], exact: false }),
			queryClient.refetchQueries({ queryKey: ['onDeck'], exact: false }),
			queryClient.refetchQueries({ queryKey: ['recentlyAddedBooks'], exact: false }),
			queryClient.refetchQueries({ queryKey: ['recentlyAddedSeries'], exact: false }),
			queryClient.refetchQueries({ queryKey: ['smartListById'], exact: false }),
		])
	}, [bookId, onLocationChanged, onPageChanged, queryClient])

	/**
	 * Invalidate the book query when a reader is unmounted so that the book overview
	 * is updated with the latest read progress
	 */
	useEffect(
		() => {
			NavigationBar.setVisibilityAsync('hidden')
			return () => {
				NavigationBar.setVisibilityAsync('visible')
				onExitReader()
			}
		},
		// this should be fine, but in practice we will see. i'd prefer to avoid needless pushes
		// if we can, and spamming the navigation bar visibility
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[bookId],
	)

	const requestHeaders = useCallback(
		() => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
		[sdk],
	)

	const currentProgressPage = useMemo(() => book.readProgress?.page || 1, [book.readProgress?.page])
	const offlineUri = useMemo(
		() => (record ? `${booksDirectory(serverId)}/${record.filename}` : undefined),
		[record, serverId],
	)

	if (!book || isLoadingRecord) return null

	if (book.extension.match(EBOOK_EXTENSION)) {
		const initialLocator = book.readProgress?.locator || undefined

		return (
			<ReadiumReader
				book={book}
				timer={timer}
				initialLocator={initialLocator ? intoReadiumLocator(initialLocator) : undefined}
				onLocationChanged={onLocationChanged}
				onReachedEnd={onReachedEnd}
				onBookmark={onBookmark}
				onDeleteBookmark={onDeleteBookmark}
				offlineUri={offlineUri}
				serverId={serverId}
				requestHeaders={requestHeaders}
				onCreateAnnotation={onCreateAnnotation}
				onUpdateAnnotation={onUpdateAnnotation}
				onDeleteAnnotation={onDeleteAnnotation}
			/>
		)
	} else if (book.extension.match(PDF_EXTENSION) && preferNativePdfReader) {
		return (
			<PdfReader
				book={book}
				initialPage={currentProgressPage}
				onPageChanged={onPageChanged}
				serverId={serverId}
				// incognito
				timer={timer}
			/>
		)
	} else if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		return (
			<ImageBasedReader
				initialPage={currentProgressPage}
				book={book}
				pageURL={(page: number) => sdk.media.bookPageURL(book.id, page)}
				onPageChanged={onPageChanged}
				timer={timer}
				resetTimer={resetTimer}
				nextInSeries={nextInSeries}
				serverId={serverId}
				requestHeaders={requestHeaders}
			/>
		)
	}

	// TODO: support native PDF reader?
	// else if (book.extension.match(PDF_EXTENSION)) {}

	return <UnsupportedReader />
}
