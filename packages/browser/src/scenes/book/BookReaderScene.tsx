import { getMediaPage, mediaQueryKeys } from '@stump/api'
import { invalidateQueries, useMediaByIdQuery, useUpdateMediaProgress } from '@stump/client'
import { useEffect } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import {
	AnimatedPagedReader,
	ContinuousScrollReader,
	PagedReader,
} from '@/components/readers/image-based'
import paths from '@/paths'

import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION } from '../../utils/patterns'

export default function BookReaderScene() {
	const [search] = useSearchParams()
	const navigate = useNavigate()

	const { id } = useParams()
	if (!id) {
		throw new Error('You must provide a book ID for the reader.')
	}

	const page = search.get('page')
	const scroll = search.get('scroll')
	const isIncognito = search.get('incognito') === 'true'
	const isAnimated = search.get('animated') === 'true'
	const isStreaming = !search.get('stream') || search.get('stream') === 'true'

	const { isLoading: fetchingBook, media } = useMediaByIdQuery(id)
	const { updateReadProgress } = useUpdateMediaProgress(id, {
		onError(err) {
			console.error(err)
		},
	})

	/**
	 * An effect to invalidate the in progress media query when the component unmounts
	 * so that the in progress media list is updated when the user returns to that section
	 */
	useEffect(() => {
		return () => {
			invalidateQueries({ exact: false, keys: [mediaQueryKeys.getInProgressMedia] })
		}
	}, [])

	/**
	 * An effect to update the read progress whenever the page changes in the URL
	 */
	useEffect(() => {
		if (isIncognito) return

		const parsedPage = parseInt(page || '', 10)
		if (!parsedPage || isNaN(parsedPage) || !media) return

		const maxPage = media.pages
		if (parsedPage <= 0 || parsedPage > maxPage) return

		updateReadProgress(parsedPage)
	}, [page, updateReadProgress, media, isIncognito])

	function handleChangePage(newPage: number) {
		navigate(paths.bookReader(id!, { isAnimated, page: newPage }))
	}

	if (fetchingBook) {
		return null
	} else if (!media) {
		return <Navigate to={paths.notFound()} />
	}

	if (media.extension.match(EBOOK_EXTENSION)) {
		return (
			<Navigate
				to={paths.bookReader(id, {
					epubcfi: media.current_epubcfi || null,
					isAnimated,
					isEpub: true,
				})}
			/>
		)
	} else if (media.extension.match(PDF_EXTENSION) && !isStreaming) {
		return (
			<Navigate
				to={paths.bookReader(id, {
					isPdf: true,
					isStreaming: false,
				})}
			/>
		)
	}

	if (media.extension.match(ARCHIVE_EXTENSION) || media.extension.match(PDF_EXTENSION)) {
		const initialPage = page ? parseInt(page, 10) : media.current_page || undefined

		if (scroll) {
			return (
				<ContinuousScrollReader
					media={media}
					initialPage={initialPage}
					// FIXME: don't be lazy aaron...
					orientation={scroll as 'horizontal' | 'vertical'}
					getPageUrl={(pageNumber) => getMediaPage(id, pageNumber)}
					onProgressUpdate={isIncognito ? undefined : updateReadProgress}
				/>
			)
		} else if (!page || parseInt(page, 10) <= 0) {
			return <Navigate to={paths.bookReader(id, { isAnimated, page: 1 })} />
		} else if (parseInt(page, 10) > media.pages) {
			return <Navigate to={paths.bookReader(id, { isAnimated, page: media.pages })} />
		} else {
			const animated = !!search.get('animated')
			const Component = animated ? AnimatedPagedReader : PagedReader

			return (
				<Component
					media={media}
					currentPage={parseInt(page, 10) ?? 1}
					getPageUrl={(pageNumber) => getMediaPage(id, pageNumber)}
					onPageChange={isIncognito ? undefined : handleChangePage}
				/>
			)
		}
	}

	return <div>Not a supported book or i just can&rsquo;t do that yet! :)</div>
}
