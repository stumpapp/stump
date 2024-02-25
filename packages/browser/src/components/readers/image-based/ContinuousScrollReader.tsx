import { usePrevious } from '@stump/components'
import { Media } from '@stump/types'
import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Virtuoso } from 'react-virtuoso'

import { useReaderStore } from '@/stores'

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
	/**
	 * A callback to report when the page has changed. If undefined, no callback will be called.
	 */
	onPageChanged?(page: number): void
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
	onPageChanged,
}: Props) {
	/**
	 * The currently visible range of index(es) on the page
	 */
	const [visibleRange, setVisibleRange] = useState({
		endIndex: 0,
		startIndex: 0,
	})

	const { showToolBar, setShowToolBar } = useReaderStore((state) => ({
		setShowToolBar: state.setShowToolBar,
		showToolBar: state.showToolBar,
	}))

	const reportedUnsupportedMode = useRef(false)

	const { startIndex: currentIndex } = visibleRange
	const previousIndex = usePrevious(currentIndex)
	const pageDidChange = previousIndex != undefined && previousIndex !== currentIndex
	/**
	 * An effect to report the progress of the current page. It will only report the progress
	 * if the page has changed since the _last_ render.
	 */
	useEffect(() => {
		const page = currentIndex + 1
		if (pageDidChange) {
			onProgressUpdate?.(page)
			onPageChanged?.(page)
		}
	}, [currentIndex, onProgressUpdate, onPageChanged, pageDidChange])

	// TODO: support this and remove effect
	useEffect(() => {
		if (orientation === 'horizontal' && !reportedUnsupportedMode.current) {
			reportedUnsupportedMode.current = true
			toast.error('Horizontal scrolling is not supported yet!')
		}
	}, [orientation])

	return (
		<React.Fragment>
			<Virtuoso
				style={{ height: '100%' }}
				data={Array.from({ length: media.pages }).map((_, index) => getPageUrl(index + 1))}
				itemContent={(_, url) => (
					<div
						key={url}
						className="flex max-h-screen min-h-1 min-w-1 max-w-full items-center justify-center"
					>
						<img
							className="max-h-screen min-h-1 min-w-1 max-w-full select-none object-scale-down md:w-auto"
							src={url}
							onClick={() => setShowToolBar(!showToolBar)}
						/>
					</div>
				)}
				rangeChanged={setVisibleRange}
				initialTopMostItemIndex={initialPage ? initialPage - 1 : undefined}
				overscan={{ main: 5, reverse: 3 }}
			/>

			{/* TODO: config for showing/hiding this */}
			<div className="fixed bottom-2 left-2 z-50 rounded-lg bg-black bg-opacity-75 px-2 py-1 text-white">
				{visibleRange.startIndex + 1}
			</div>
		</React.Fragment>
	)
}
