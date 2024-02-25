import { getMediaPage } from '@stump/api'
import { useUpdateMediaProgress } from '@stump/client'
import { Media } from '@stump/types'
import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { usePreloadPage } from '@/hooks/usePreloadPage'
import paths from '@/paths'
import { useReaderStore } from '@/stores'

import AnimatedPagedReader from './AnimatedPagedReader'
import ContinuousScrollReader from './ContinuousScrollReader'
import PagedReader from './PagedReader'
import ReaderContainer from './ReaderContainer'

type Props = {
	/**
	 * The media which is being read
	 */
	media: Media
	/**
	 * Whether or not the reader(s) should be animated
	 *
	 * Note: This is only used to conditionally render either the `PagedReader` or `AnimatedPagedReader` component.
	 * This won't be used for the `ContinuousScrollReader` component.
	 */
	isAnimated?: boolean
	/**
	 * Whether or not the reader is in incognito mode. If true, no progress will be reported.
	 */
	isIncognito?: boolean
	/**
	 * The initial page to start on, if any. This is 1-indexed, and defaults to 1 if not provided.
	 */
	initialPage?: number
}

export default function ImageBasedReader({
	media,
	isAnimated = false,
	isIncognito,
	initialPage,
}: Props) {
	const navigate = useNavigate()

	const [currentPage, setCurrentPage] = useState(initialPage || 1)

	const { readerMode, preloadCounts } = useReaderStore((state) => ({
		preloadCounts: {
			ahead: state.preloadAheadCount,
			behind: state.preloadBehindCount,
		},
		readerMode: state.mode,
	}))

	const { updateReadProgress } = useUpdateMediaProgress(media.id, {
		onError(err) {
			console.error(err)
		},
	})
	const handleUpdateProgress = useCallback(
		(page: number) => {
			if (!isIncognito) {
				updateReadProgress(page)
			}
		},
		[updateReadProgress, isIncognito],
	)

	const handleChangePage = useCallback(
		(newPage: number) => {
			if (readerMode === 'continuous') {
				setCurrentPage(newPage)
			} else {
				setCurrentPage(newPage)
				navigate(paths.bookReader(media.id, { isAnimated, isIncognito, page: newPage }))
			}
		},
		[media.id, isAnimated, isIncognito, navigate, readerMode],
	)

	const getPageUrl = (pageNumber: number) => getMediaPage(media.id, pageNumber)

	const lastPage = media.pages
	/**
	 * The pages before and after the current page to preload. Any pages that are
	 * less than 1 or greater than the total number of pages will be ignored.
	 */
	const pagesToPreload = useMemo(
		() =>
			[...Array(preloadCounts.behind).keys()]
				.map((i) => currentPage - i - 1)
				.reverse()
				.concat([...Array(preloadCounts.ahead).keys()].map((i) => currentPage + i + 1))
				.filter((i) => i > 0 && i <= lastPage),

		[currentPage, preloadCounts, lastPage],
	)

	/**
	 * Preload pages that are not currently visible. This is done to try and
	 * prevent wait times for the next page to load.
	 */
	usePreloadPage({
		pages: pagesToPreload,
		urlBuilder: getPageUrl,
	})

	const renderReader = () => {
		if (readerMode === 'continuous') {
			return (
				<ContinuousScrollReader
					media={media}
					initialPage={currentPage}
					getPageUrl={getPageUrl}
					orientation="vertical"
					onProgressUpdate={handleUpdateProgress}
					onPageChanged={handleChangePage}
				/>
			)
		} else {
			const Component = isAnimated ? AnimatedPagedReader : PagedReader
			return (
				<Component
					media={media}
					currentPage={initialPage || 1}
					getPageUrl={(pageNumber) => getMediaPage(media.id, pageNumber)}
					onPageChange={handleChangePage}
				/>
			)
		}
	}

	return (
		<ReaderContainer media={media} currentPage={currentPage} onPageChange={handleChangePage}>
			{renderReader()}
		</ReaderContainer>
	)
}
