import { usePrevious } from '@stump/components'
import { Media } from '@stump/types'
import { useOverlayScrollbars } from 'overlayscrollbars-react'
import React, { forwardRef, useEffect, useRef, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { ScrollerProps, Virtuoso } from 'react-virtuoso'

import { useTheme } from '@/hooks/useTheme'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

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

// TODO: support reading direction, a bit awkward to do with scroll
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
	const rootRef = useRef<HTMLDivElement | null>(null)
	const [scroller, setScroller] = useState<HTMLElement | Window | null>(null)
	/**
	 * The currently visible range of index(es) on the page
	 */
	const [visibleRange, setVisibleRange] = useState({
		endIndex: 0,
		startIndex: 0,
	})

	const {
		settings: { showToolBar, preload },
		setSettings,
	} = useBookPreferences({ book: media })

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
	const { isDarkVariant } = useTheme()

	const [initialize] = useOverlayScrollbars({
		defer: true,
		options: {
			scrollbars: {
				theme: isDarkVariant ? 'os-theme-light' : 'os-theme-dark',
			},
		},
	})

	useEffect(() => {
		const { current: root } = rootRef

		if (scroller && root) {
			// TODO: this fucks up the virtualization...
			// initialize({
			// 	elements: {
			// 		// @ts-expect-error: types are wrong
			// 		viewport: scroller,
			// 	},
			// 	target: root,
			// })
		}
	}, [initialize, scroller])

	// TODO: use page dimensions to calculate the height of the page
	return (
		<div className="flex flex-1" data-overlayscrollbars-initialize ref={rootRef}>
			<AutoSizer>
				{({ height, width }) => (
					<Virtuoso
						scrollerRef={setScroller}
						style={{ height, width }}
						useWindowScroll={false}
						horizontalDirection={orientation === 'horizontal'}
						data={Array.from({ length: media.pages }).map((_, index) => getPageUrl(index + 1))}
						components={{
							Scroller: orientation === 'horizontal' ? HorizontalScroller : undefined,
						}}
						itemContent={(_, url) => (
							<div
								key={url}
								style={{
									height,
									width,
								}}
								className="flex justify-center"
							>
								<img
									className="max-h-full select-none object-scale-down md:w-auto"
									src={url}
									onClick={() => setSettings({ showToolBar: !showToolBar })}
								/>
							</div>
						)}
						rangeChanged={setVisibleRange}
						initialTopMostItemIndex={initialPage ? initialPage - 1 : undefined}
						overscan={{ main: preload.ahead || 1, reverse: preload.behind || 1 }}
					/>
				)}
			</AutoSizer>

			{/* TODO: config for showing/hiding this */}
			<div className="fixed bottom-2 left-2 z-50 rounded-lg bg-black bg-opacity-75 px-2 py-1 text-white">
				{visibleRange.startIndex + 1}
			</div>
		</div>
	)
}

const HorizontalScroller = forwardRef<HTMLDivElement, ScrollerProps>(
	({ children, ...props }, ref) => {
		return (
			<div className="overflow-y-hidden" ref={ref} {...props}>
				{children}
			</div>
		)
	},
)
HorizontalScroller.displayName = 'HorizontalScroller'
