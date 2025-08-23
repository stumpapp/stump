import { invalidateQueries, useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { BookReaderSceneQuery, graphql, ReadingMode } from '@stump/graphql'
import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ImageBasedReader } from '@/components/readers/imageBased'
import paths from '@/paths'

import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION } from '../../../utils/patterns'
import { useBookPreferences } from './useBookPreferences'

export const BOOK_READER_SCENE_QUERY = graphql(`
	query BookReaderScene($id: ID!) {
		mediaById(id: $id) {
			id
			resolvedName
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
			metadata {
				pageAnalysis {
					dimensions {
						height
						width
					}
				}
			}
		}
	}
`)

export default function BookReaderSceneContainer() {
	const navigate = useNavigate()

	const { id } = useParams()
	const { sdk } = useSDK()
	const {
		data: { mediaById: media },
	} = useSuspenseGraphQL(BOOK_READER_SCENE_QUERY, sdk.cacheKey('bookReader', [id]), {
		id: id || '',
	})

	useEffect(() => {
		if (!media) {
			navigate(paths.notFound(), { replace: true })
		}
	}, [media, navigate])

	if (!media) {
		return null
	}

	return (
		<Suspense>
			<BookReaderScene book={media} />
		</Suspense>
	)
}

const mutation = graphql(`
	mutation UpdateReadProgress($id: ID!, $page: Int!, $elapsedSeconds: Int!) {
		updateMediaProgress(id: $id, page: $page, elapsedSeconds: $elapsedSeconds) {
			__typename
		}
	}
`)

type Props = {
	book: NonNullable<BookReaderSceneQuery['mediaById']>
}

function BookReaderScene({ book }: Props) {
	const navigate = useNavigate()
	const [search] = useSearchParams()

	const { sdk } = useSDK()

	const page = search.get('page')
	const isIncognito = search.get('incognito') === 'true'
	const isStreaming = !search.get('stream') || search.get('stream') === 'true'

	const { mutate } = useGraphQLMutation(mutation, {
		onError: (err) => {
			console.error(err)
		},
	})
	const updateProgress = useCallback(
		(page: number, elapsedSeconds: number) => {
			if (!book) return
			if (isIncognito) return
			if (book.readProgress?.page === page) return
			mutate({
				id: book.id,
				page,
				elapsedSeconds,
			})
		},
		[book, mutate, isIncognito],
	)

	const {
		bookPreferences: { readingMode, animatedReader },
	} = useBookPreferences({ book })

	/**
	 * An effect to invalidate the in progress media query when the component unmounts
	 * so that the in progress media list is updated when the user returns to that section
	 */
	useEffect(() => {
		return () => {
			invalidateQueries({ exact: false, keys: [sdk.media.keys.inProgress] })
		}
	}, [sdk.media])

	/**
	 * An effect to update the read progress whenever the page changes in the URL
	 */
	useEffect(() => {
		if (isIncognito) return

		const parsedPage = parseInt(page || '', 10)
		if (!parsedPage || isNaN(parsedPage) || !book) return

		const maxPage = book.pages
		if (parsedPage <= 0 || parsedPage > maxPage) return

		updateProgress(parsedPage, book.readProgress?.elapsedSeconds || 0)
	}, [page, updateProgress, book, isIncognito])

	const initialPage = useMemo(() => (page ? parseInt(page, 10) : undefined), [page])

	useEffect(() => {
		if (book.extension.match(EBOOK_EXTENSION)) {
			navigate(
				paths.bookReader(book.id, {
					epubcfi: book.readProgress?.epubcfi || null,
					isEpub: true,
				}),
			)
		} else if (book.extension.match(PDF_EXTENSION) && !isStreaming) {
			navigate(paths.bookReader(book.id, { isPdf: true, isStreaming: false }))
		} else if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
			if (!initialPage && readingMode === ReadingMode.Paged && !animatedReader) {
				navigate(paths.bookReader(book.id, { page: 1 }))
			} else if (!!initialPage && initialPage > book.pages) {
				navigate(paths.bookReader(book.id, { page: book.pages }))
			}
		}
	}, [book, initialPage, readingMode, navigate, isStreaming, animatedReader])

	if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		return (
			<ImageBasedReader
				media={book}
				isIncognito={isIncognito}
				initialPage={initialPage}
				onProgress={updateProgress}
			/>
		)
	}

	return null
}
