import {
	ARCHIVE_EXTENSION,
	EBOOK_EXTENSION,
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
import { useCallback, useEffect, useMemo } from 'react'

import { useActiveServer } from '~/components/activeServer'
import {
	ImageBasedReader,
	PdfReader,
	ReadiumReader,
	UnsupportedReader,
} from '~/components/book/reader'
import { NextInSeriesBookRef } from '~/components/book/reader/image/context'
import { db, downloadedFiles } from '~/db'
import { booksDirectory } from '~/lib/filesystem'
import { useAppState, useSyncOnlineToOfflineProgress } from '~/lib/hooks'
import { intoReadiumLocator, ReadiumLocator } from '~/modules/readium'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { useBookPreferences, useBookTimer } from '~/stores/reader'

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
			__typename
		}
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

type Params = {
	id: string
}

export default function Screen() {
	useKeepAwake()

	const { id: bookID } = useLocalSearchParams<Params>()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const { sdk } = useSDK()
	const {
		data: { mediaById: book },
	} = useSuspenseGraphQL(query, ['readBook', bookID], {
		id: bookID,
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
	const { pause, resume, totalSeconds, isRunning, reset } = useBookTimer(book?.id || '', {
		initial: book?.readProgress?.elapsedSeconds,
		enabled: trackElapsedTime,
	})

	const { syncProgress } = useSyncOnlineToOfflineProgress({ bookId: book.id, serverId })

	const { mutate: updateProgress } = useGraphQLMutation(mutation, {
		retry: (attempts) => attempts < 3,
		throwOnError: false,
		onError: (error) => {
			console.error('Failed to update read progress:', error)
		},
		// TODO: Consider a preference to disable online-to-offline sync?
		onSuccess: (_, { input: onlineProgress }) => syncProgress(onlineProgress),
	})

	const onPageChanged = useCallback(
		(page: number) => {
			updateProgress({
				id: book.id,
				input: {
					paged: {
						page,
						elapsedSeconds: totalSeconds,
					},
				},
			})
		},
		[book.id, totalSeconds, updateProgress],
	)

	const onLocationChanged = useCallback(
		(locator: ReadiumLocator, percentage: number) => {
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
						elapsedSeconds: totalSeconds,
						percentage,
						isComplete: percentage >= 0.99,
					},
				},
			})
		},
		[book.id, totalSeconds, updateProgress],
	)

	const { mutateAsync: createBookmark } = useGraphQLMutation(createBookmarkMutation, {
		onError: (error) => {
			console.error('Failed to create bookmark:', error)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['readBook', book.id] })
		},
	})

	const { mutateAsync: deleteBookmark } = useGraphQLMutation(deleteBookmarkMutation, {
		onError: (error) => {
			console.error('Failed to delete bookmark:', error)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['readBook', book.id] })
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

	/**
	 * Invalidate the book query when a reader is unmounted so that the book overview
	 * is updated with the latest read progress
	 */
	useEffect(() => {
		NavigationBar.setVisibilityAsync('hidden')
		return () => {
			NavigationBar.setVisibilityAsync('visible')
			Promise.all([
				queryClient.refetchQueries({ queryKey: ['bookById', bookID], exact: false }),
				queryClient.refetchQueries({ queryKey: ['readBook', bookID], exact: false }),
				queryClient.refetchQueries({ queryKey: ['continueReading'], exact: false }),
				queryClient.refetchQueries({ queryKey: ['onDeck'], exact: false }),
				queryClient.refetchQueries({ queryKey: ['recentlyAddedBooks'], exact: false }),
				queryClient.refetchQueries({ queryKey: ['recentlyAddedSeries'], exact: false }),
			])
		}
	}, [queryClient, bookID])

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
				initialLocator={initialLocator ? intoReadiumLocator(initialLocator) : undefined}
				onLocationChanged={onLocationChanged}
				onBookmark={onBookmark}
				onDeleteBookmark={onDeleteBookmark}
				offlineUri={offlineUri}
				serverId={serverId}
				requestHeaders={requestHeaders}
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
				resetTimer={reset}
			/>
		)
	} else if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		return (
			<ImageBasedReader
				initialPage={currentProgressPage}
				book={book}
				pageURL={(page: number) => sdk.media.bookPageURL(book.id, page)}
				onPageChanged={onPageChanged}
				resetTimer={reset}
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
