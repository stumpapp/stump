import {
	DEFAULT_BOOK_PREFERENCES,
	queryClient,
	useSDK,
	useUpdateMediaProgress,
} from '@stump/client'
import { generatePageSets, Media } from '@stump/sdk'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useWindowSize } from 'rooks'

import { usePreloadPage } from '@/hooks/usePreloadPage'
import paths from '@/paths'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { useBookTimer } from '@/stores/reader'

import ReaderContainer from './container'
import { ImageBaseReaderContext, ImagePageDimensionRef } from './context'
import { ContinuousScrollReader } from './continuous'
import { AnimatedPagedReader, PagedReader } from './paged'

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

// TODO: support read time
export default function ImageBasedReader({
	media,
	isAnimated = false,
	isIncognito,
	initialPage,
}: Props) {
	const { sdk } = useSDK()
	const navigate = useNavigate()

	/**
	 * The current page of the reader
	 */
	const [currentPage, setCurrentPage] = useState(initialPage || 1)

	const [pageDimensions, setPageDimensions] = useState<Record<number, ImagePageDimensionRef>>(
		() =>
			media?.metadata?.page_dimensions?.dimensions
				?.map(({ height, width }) => ({
					height,
					width,
					ratio: width / height,
				}))
				.reduce(
					(acc, ref, index) => {
						acc[index] = ref
						return acc
					},
					{} as Record<number, { height: number; width: number; ratio: number }>,
				) ?? {},
	)

	const {
		settings: { preload, showToolBar },
		bookPreferences: {
			doublePageBehavior = DEFAULT_BOOK_PREFERENCES.doublePageBehavior,
			readingMode,
			readingDirection,
			trackElapsedTime,
			secondPageSeparate,
		},
		setSettings,
	} = useBookPreferences({ book: media })

	const { pause, resume, totalSeconds, isRunning, reset } = useBookTimer(media?.id || '', {
		initial: media?.active_reading_session?.elapsed_seconds,
		enabled: trackElapsedTime,
	})

	useEffect(() => {
		if (showToolBar && isRunning) {
			pause()
		} else if (!showToolBar && !isRunning) {
			resume()
		}
	}, [showToolBar, isRunning, pause, resume])

	const windowSize = useWindowSize()

	const deviceOrientation = useMemo(
		() => ((windowSize.innerWidth || 0) > (windowSize.innerHeight || 0) ? 'landscape' : 'portrait'),
		[windowSize],
	)

	const pages = media.pages
	const pageSets = useMemo(() => {
		const autoButOff = doublePageBehavior === 'auto' && deviceOrientation === 'portrait'
		const modeForceOff = readingMode === 'continuous:vertical'
		let sets: number[][] = []

		if (doublePageBehavior === 'off' || autoButOff || modeForceOff) {
			sets = Array.from({ length: pages }, (_, i) => [i])
		} else {
			sets = generatePageSets({
				imageSizes: pageDimensions,
				pages: pages,
				secondPageSeparate: secondPageSeparate,
			})
		}

		if (readingDirection === 'rtl') {
			return [...sets.map((set) => [...set].reverse())].reverse()
		}

		return sets
	}, [
		doublePageBehavior,
		pages,
		pageDimensions,
		deviceOrientation,
		readingMode,
		readingDirection,
		secondPageSeparate,
	])

	const { updateReadProgress } = useUpdateMediaProgress(media.id, {
		retry: (attempts) => attempts < 3,
		useErrorBoundary: false,
	})
	/**
	 * A callback to update the read progress, if the reader is not in incognito mode.
	 */
	const handleUpdateProgress = useCallback(
		(page: number) => {
			if (!isIncognito) {
				updateReadProgress({ page, elapsed_seconds: totalSeconds })
			}
		},
		[updateReadProgress, isIncognito, totalSeconds],
	)

	/**
	 * A callback to handle when the page changes. This will update the URL to reflect the new page
	 * if the reader mode is not continuous.
	 */
	const handleChangePage = useCallback(
		(newPage: number) => {
			if (readingMode.startsWith('continuous')) {
				setCurrentPage(newPage)
			} else {
				setCurrentPage(newPage)
				navigate(paths.bookReader(media.id, { isAnimated, isIncognito, page: newPage }))
			}
		},
		[media.id, isAnimated, isIncognito, navigate, readingMode],
	)

	/**
	 * A callback to get the URL of a page. This is *not* 0-indexed, so the first page is 1.
	 */
	const getPageUrl = (pageNumber: number) => sdk.media.bookPageURL(media.id, pageNumber)

	const lastPage = media.pages
	/**
	 * The pages before and after the current page to preload. Any pages that are
	 * less than 1 or greater than the total number of pages will be ignored.
	 */
	const pagesToPreload = useMemo(
		() =>
			[...Array(preload.behind).keys()]
				.map((i) => currentPage - i - 1)
				.reverse()
				.concat([...Array(preload.ahead).keys()].map((i) => currentPage + i + 1))
				.filter((i) => i > 0 && i <= lastPage),

		[currentPage, preload, lastPage],
	)

	/**
	 * Preload pages that are not currently visible. This is done to try and
	 * prevent wait times for the next page to load.
	 */
	usePreloadPage({
		onStoreDimensions: (page, dimensions) => {
			setPageDimensions((prev) => ({ ...prev, [page - 1]: dimensions }))
		},
		pages: pagesToPreload,
		urlBuilder: getPageUrl,
	})

	/**
	 * This effect is primarily responsible for two cleanup tasks:
	 *
	 * 1. Hiding the toolbar when the component unmounts. This is done to ensure that the toolbar is not
	 *    visible when the user navigates *back* to a reader again at some point.
	 * 2. Invalidating the in-progress media query when the component unmounts. This is done to ensure that
	 *    when the user navigates away from the reader, the in-progress media is accurately reflected with
	 *    the latest reading session.
	 */
	useEffect(
		() => {
			return () => {
				setSettings({
					showToolBar: false,
				})
				queryClient.invalidateQueries([sdk.media.keys.inProgress], { exact: false })
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	const renderReader = () => {
		if (readingMode.startsWith('continuous')) {
			return (
				<ContinuousScrollReader
					media={media}
					initialPage={currentPage}
					getPageUrl={getPageUrl}
					onProgressUpdate={handleUpdateProgress}
					onPageChanged={handleChangePage}
					orientation={(readingMode.split(':')[1] as 'vertical' | 'horizontal') || 'vertical'}
				/>
			)
		} else {
			const Component = isAnimated ? AnimatedPagedReader : PagedReader
			return (
				<Component
					media={media}
					currentPage={initialPage || 1}
					getPageUrl={(pageNumber) => sdk.media.bookPageURL(media.id, pageNumber)}
					onPageChange={handleChangePage}
				/>
			)
		}
	}

	return (
		<ImageBaseReaderContext.Provider
			value={{
				book: media,
				currentPage,
				pageDimensions,
				setCurrentPage: handleChangePage,
				setDimensions: setPageDimensions,
				pageSets,
				resetTimer: reset,
			}}
		>
			<ReaderContainer>{renderReader()}</ReaderContainer>
		</ImageBaseReaderContext.Provider>
	)
}
