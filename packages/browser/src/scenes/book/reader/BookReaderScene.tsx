import { invalidateQueries, useMediaByIdQuery, useSDK, useUpdateMediaProgress } from '@stump/client'
import { Media } from '@stump/sdk'
import { Suspense, useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import { ImageBasedReader } from '@/components/readers/imageBased'
import paths from '@/paths'

import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION } from '../../../utils/patterns'
import { useBookPreferences } from './useBookPreferences'

export default function BookReaderSceneContainer() {
	const { id } = useParams()

	const { media } = useMediaByIdQuery(id || '', {
		params: {
			load_library: true,
		},
		suspense: true,
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

type Props = {
	book: Media
}

function BookReaderScene({ book }: Props) {
	const [search] = useSearchParams()

	const { sdk } = useSDK()

	const page = search.get('page')
	const isIncognito = search.get('incognito') === 'true'
	const isAnimated = search.get('animated') === 'true'
	const isStreaming = !search.get('stream') || search.get('stream') === 'true'

	const { updateReadProgress } = useUpdateMediaProgress(book.id, {
		onError(err) {
			console.error(err)
		},
	})

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

		updateReadProgress({ page: parsedPage })
	}, [page, updateReadProgress, book, isIncognito])

	if (book.extension.match(EBOOK_EXTENSION)) {
		return (
			<Navigate
				to={paths.bookReader(book.id, {
					epubcfi: book.current_epubcfi || null,
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
		if (!initialPage && readingMode === 'paged') {
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
				/>
			)
		}
	}

	return <div>Not a supported book or i just can&rsquo;t do that yet! :)</div>
}
