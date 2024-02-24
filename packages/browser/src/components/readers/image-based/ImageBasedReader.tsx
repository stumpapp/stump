import { getMediaPage } from '@stump/api'
import { useReaderStore, useUpdateMediaProgress } from '@stump/client'
import { Media } from '@stump/types'
import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { usePreloadPage } from '@/hooks/usePreloadPage'
import paths from '@/paths'

import AnimatedPagedReader from './AnimatedPagedReader'
import ContinuousScrollReader from './ContinuousScrollReader'
import PagedReader from './PagedReader'
import ReaderContainer from './ReaderContainer'

const DEFAULT_PRELOAD_COUNT = 4

type Props = {
	media: Media
	isAnimated?: boolean
	isIncognito?: boolean
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

	const readerMode = useReaderStore((state) => state.mode)

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
				navigate(paths.bookReader(media.id, { isAnimated, isIncognito, page: newPage }))
			}
		},
		[media.id, isAnimated, isIncognito, navigate, readerMode],
	)

	const getPageUrl = (pageNumber: number) => getMediaPage(media.id, pageNumber)

	const pagesToPreload = useMemo(
		() => [...Array(DEFAULT_PRELOAD_COUNT).keys()].map((i) => currentPage + i + 1),
		[currentPage],
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
					// orientation="vertical"
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
