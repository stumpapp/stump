import { getMediaPage, mediaQueryKeys } from '@stump/api'
import { invalidateQueries, useMediaByIdQuery, useUpdateMediaProgress } from '@stump/client'
import { useEffect } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import AnimatedPagedReader from '@/components/readers/image-based/AnimatedPagedReader'
import PagedReader from '@/components/readers/image-based/PagedReader'

import paths from '../../paths'
import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION } from '../../utils/patterns'

export default function BookReaderScene() {
	const [search] = useSearchParams()
	const navigate = useNavigate()

	const { id } = useParams()
	if (!id) {
		throw new Error('You must provide a book ID for the reader.')
	}

	const page = search.get('page')
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
			invalidateQueries({ keys: [mediaQueryKeys.getInProgressMedia] })
		}
	}, [])

	function handleChangePage(newPage: number) {
		updateReadProgress(newPage)
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
	} else if (!page || parseInt(page, 10) <= 0) {
		return <Navigate to={paths.bookReader(id, { isAnimated, page: 1 })} />
	} else if (parseInt(page, 10) > media.pages) {
		return <Navigate to={paths.bookReader(id, { isAnimated, page: media.pages })} />
	}

	if (media.extension.match(ARCHIVE_EXTENSION) || media.extension.match(PDF_EXTENSION)) {
		const animated = !!search.get('animated')
		const Component = animated ? AnimatedPagedReader : PagedReader

		return (
			<Component
				media={media}
				currentPage={parseInt(page, 10)}
				getPageUrl={(pageNumber) => getMediaPage(id, pageNumber)}
				onPageChange={handleChangePage}
			/>
		)
	}

	return <div>Not a supported book or i just can&rsquo;t do that yet! :)</div>
}
