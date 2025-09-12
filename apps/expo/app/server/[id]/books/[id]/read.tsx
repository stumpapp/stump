import {
	ARCHIVE_EXTENSION,
	EBOOK_EXTENSION,
	PDF_EXTENSION,
	useGraphQLMutation,
	useSDK,
	useSuspenseGraphQL,
} from '@stump/client'
import { Dimension, graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo } from 'react'

import { EpubJSReader, ImageBasedReader, UnsupportedReader } from '~/components/book/reader'
import { NextInSeriesBookRef } from '~/components/book/reader/image/context'
import { useAppState } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences, useBookTimer } from '~/stores/reader'

export const query = graphql(`
	query BookReadScreen($id: ID!) {
		mediaById(id: $id) {
			id
			name: resolvedName
			pages
			extension
			readProgress {
				percentageCompleted
				epubcfi
				page
				elapsedSeconds
			}
			libraryConfig {
				defaultReadingImageScaleFit
				defaultReadingMode
				defaultReadingDir
			}
			pageAnalysis {
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

type Params = {
	id: string
}

export default function Screen() {
	useKeepAwake()

	const { id: bookID } = useLocalSearchParams<Params>()
	const { sdk } = useSDK()
	const {
		data: { mediaById: book },
	} = useSuspenseGraphQL(query, ['readBook', bookID], {
		id: bookID,
	})
	const queryClient = useQueryClient()

	if (!book) {
		throw new Error('Book not found')
	}

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
		preferences: { preferSmallImages, trackElapsedTime },
	} = useBookPreferences({ book })
	const { pause, resume, totalSeconds, isRunning, reset } = useBookTimer(book?.id || '', {
		initial: book?.readProgress?.elapsedSeconds,
		enabled: trackElapsedTime,
	})

	const { mutate: updateProgress } = useGraphQLMutation(mutation, {
		retry: (attempts) => attempts < 3,
		throwOnError: false,
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

	const onEpubCfiChanged = useCallback(
		(cfi: string, percentage: number) => {
			updateProgress({
				id: book.id,
				input: {
					epub: {
						epubcfi: cfi,
						elapsedSeconds: totalSeconds,
						percentage,
					},
				},
			})
		},
		[book.id, totalSeconds, updateProgress],
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
	useEffect(
		() => {
			NavigationBar.setVisibilityAsync('hidden')
			return () => {
				NavigationBar.setVisibilityAsync('visible')
				Promise.all([
					queryClient.refetchQueries({ queryKey: ['bookById', bookID], exact: false }),
					queryClient.refetchQueries({ queryKey: ['continueReading'], exact: false }),
					queryClient.refetchQueries({ queryKey: ['onDeck'], exact: false }),
					queryClient.refetchQueries({ queryKey: ['recentlyAddedBooks'], exact: false }),
					queryClient.refetchQueries({ queryKey: ['recentlyAddedSeries'], exact: false }),
				])
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	if (!book) return null

	if (book.extension.match(EBOOK_EXTENSION)) {
		const currentProgressCfi = book.readProgress?.epubcfi || undefined
		// const initialCfi = restart ? undefined : currentProgressCfi
		return (
			<EpubJSReader
				book={book}
				initialCfi={currentProgressCfi} /*incognito={incognito}*/
				onEpubCfiChanged={onEpubCfiChanged}
			/>
		)
	} else if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		const currentProgressPage = book.readProgress?.page || 1
		// const initialPage = restart ? 1 : currentProgressPage
		const initialPage = currentProgressPage
		return (
			<ImageBasedReader
				initialPage={initialPage}
				book={book}
				pageURL={(page: number) => sdk.media.bookPageURL(book.id, page)}
				pageThumbnailURL={
					preferSmallImages
						? (page: number) =>
								sdk.media.bookPageURL(book.id, page, {
									dimension: Dimension.Height,
									size: 600,
								})
						: undefined
				}
				onPageChanged={onPageChanged}
				resetTimer={reset}
				nextInSeries={nextInSeries}
			/>
		)
	}

	// TODO: support native PDF reader?
	// else if (book.extension.match(PDF_EXTENSION)) {}

	return <UnsupportedReader />
}
