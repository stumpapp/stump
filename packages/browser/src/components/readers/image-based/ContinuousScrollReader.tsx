import { useReaderStore } from '@stump/client'
import { usePrevious } from '@stump/components'
import { Media } from '@stump/types'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'

import Toolbar from './Toolbar'

export type ContinuousReaderOrientation = 'horizontal' | 'vertical'
type Props = {
	/**
	 * The media which is being read
	 */
	media: Media
	/**
	 * The initial page to start on, if any
	 */
	initialPage?: number
	// TODO: react-virtuoso doesn't support horizontal. I'd like to see how involved it would be to add it
	// directly! https://github.com/petyosi/react-virtuoso/issues/62
	/**
	 * The orientation of the reader. Only vertical is supported at the moment.
	 */
	orientation?: ContinuousReaderOrientation
	/**
	 * A callback to get the URL of a page. This is *not* 0-indexed, so the first page is 1.
	 */
	getPageUrl(page: number): string
	/**
	 * A callback to report the progress of the current page. If undefined, no progress will be reported.
	 */
	onProgressUpdate?(page: number): void
}

/**
 * A reader component for **image-based** books that allows for continuous scrolling.
 *
 * Note that only vertical scrolling is supported at the moment. Horizontal scrolling is not supported,
 * but hopefully will be in the future.
 */
export default function ContinuousScrollReader({
	media,
	initialPage,
	getPageUrl,
	orientation,
	onProgressUpdate,
}: Props) {
	const [search, setSearch] = useSearchParams()
	/**
	 * A state to control the visibility of the toolbar
	 */
	const [showToolBar, setShowToolBar] = useState(false)
	/**
	 * The currently visible range of index(es) on the page
	 */
	const [visibleRange, setVisibleRange] = useState({
		endIndex: 0,
		startIndex: 0,
	})

	const setReaderMode = useReaderStore((state) => state.setMode)

	const reportedUnsupportedMode = useRef(false)

	const { startIndex: currentIndex } = visibleRange
	const previousIndex = usePrevious(currentIndex)
	const shouldReportProgress = previousIndex != undefined && previousIndex !== currentIndex
	/**
	 * An effect to report the progress of the current page. It will only report the progress
	 * if the page has changed since the _last_ render.
	 */
	useEffect(() => {
		const page = currentIndex + 1
		if (shouldReportProgress) {
			onProgressUpdate?.(page)
		}
	}, [currentIndex, onProgressUpdate, shouldReportProgress])

	// TODO: support this and remove effect
	useEffect(() => {
		if (orientation === 'horizontal' && !reportedUnsupportedMode.current) {
			reportedUnsupportedMode.current = true
			toast.error('Horizontal scrolling is not supported yet!')
		}
	}, [orientation])

	const onChangeReaderMode = useCallback(() => {
		search.append('page', (visibleRange.startIndex + 1).toString())
		setSearch(search)
		setReaderMode('paged')
	}, [setReaderMode, search, setSearch, visibleRange.startIndex])

	return (
		<>
			<Toolbar
				title={media.name}
				currentPage={visibleRange.startIndex + 1}
				pages={media.pages}
				visible={showToolBar}
				onChangeReaderMode={onChangeReaderMode}
				showBottomToolbar={false}
			/>

			<Virtuoso
				style={{ height: '100%' }}
				data={Array.from({ length: media.pages }).map((_, index) => getPageUrl(index + 1))}
				itemContent={(_, url) => (
					<div className="flex max-h-screen min-h-1 min-w-1 max-w-full items-center justify-center">
						<img
							className="max-h-screen min-h-1 min-w-1 max-w-full select-none object-scale-down md:w-auto"
							src={url}
							onClick={() => setShowToolBar((prev) => !prev)}
						/>
					</div>
				)}
				rangeChanged={setVisibleRange}
				initialTopMostItemIndex={initialPage ? initialPage - 1 : undefined}
				overscan={5}
			/>

			{/* TODO: config for showing/hiding this */}
			<div className="fixed bottom-2 left-2 z-50 rounded-lg bg-black bg-opacity-75 px-2 py-1 text-white">
				{visibleRange.startIndex + 1}
			</div>
		</>
	)
}
