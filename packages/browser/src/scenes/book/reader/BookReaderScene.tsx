import { invalidateQueries, useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { BookReaderSceneQuery, graphql, ReadingMode } from '@stump/graphql'
import { Suspense, useCallback, useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

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
			}
			libraryConfig {
				defaultReadingImageScaleFit
				defaultReadingMode
				defaultReadingDir
			}
		}
	}
`)

export default function BookReaderSceneContainer() {
	const { id } = useParams()

	const {
		data: { mediaById: media },
	} = useSuspenseGraphQL(BOOK_READER_SCENE_QUERY, ['bookReader', id], {
		id: id || '',
	})

	if (!media) {
		return <Navigate to={paths.notFound()} />
	}

	return (
		<Suspense>
			<BookReaderScene book={media} />
		</Suspense>
	)
}

const mutation = graphql(`
	mutation UpdateReadProgress($id: ID!, $page: Int!) {
		updateMediaProgress(id: $id, page: $page) {
			__typename
		}
	}
`)

type Props = {
	book: NonNullable<BookReaderSceneQuery['mediaById']>
}

function BookReaderScene({ book }: Props) {
	const [search] = useSearchParams()

	const { sdk } = useSDK()

	const page = search.get('page')
	const isIncognito = search.get('incognito') === 'true'
	const isAnimated = search.get('animated') === 'true'
	const isStreaming = !search.get('stream') || search.get('stream') === 'true'

	const { mutate } = useGraphQLMutation(mutation, {
		onError: (err) => {
			console.error(err)
		},
	})
	const updateProgress = useCallback(
		(page: number) => {
			if (!book) return
			if (isIncognito) return
			if (book.readProgress?.page === page) return
			mutate({
				id: book.id,
				page,
			})
		},
		[book, mutate, isIncognito],
	)

	const {
		bookPreferences: { readingMode },
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

		updateProgress(parsedPage)
	}, [page, book, isIncognito, updateProgress])

	if (book.extension.match(EBOOK_EXTENSION)) {
		const epubcfi = book.readProgress?.epubcfi || null
		return (
			<Navigate
				to={paths.bookReader(book.id, {
					epubcfi,
					isAnimated,
					isEpub: true,
				})}
			/>
		)
	} else if (book.extension.match(PDF_EXTENSION) && !isStreaming) {
		return (
			<Navigate
				to={paths.bookReader(book.id, {
					isPdf: true,
					isStreaming: false,
				})}
			/>
		)
	}

	const initialPage = page ? parseInt(page, 10) : undefined

	if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		if (!initialPage && readingMode === ReadingMode.Paged) {
			return <Navigate to={paths.bookReader(book.id, { isAnimated, page: 1 })} />
		} else if (!!initialPage && initialPage > book.pages) {
			return <Navigate to={paths.bookReader(book.id, { isAnimated, page: book.pages })} />
		} else {
			return (
				<ImageBasedReader
					media={book}
					isAnimated={isAnimated}
					isIncognito={isIncognito}
					initialPage={initialPage}
					onProgress={updateProgress}
				/>
			)
		}
	}

	return <div>Not a supported book or i just can&rsquo;t do that yet! :)</div>
}
