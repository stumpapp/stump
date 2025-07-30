import { BookImageScaling } from '@stump/client'
import { cn, usePrevious } from '@stump/components'
import { Media } from '@stump/sdk'
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'
import { ScrollerProps, Virtuoso } from 'react-virtuoso'

import { EntityImage } from '@/components/entity'
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
	const [search, setSearch] = useSearchParams()
	const rootRef = useRef<HTMLDivElement | null>(null)
	/**
	 * The currently visible range of index(es) on the page
	 */
	const [visibleRange, setVisibleRange] = useState({
		endIndex: 0,
		startIndex: 0,
	})

	const {
		bookPreferences: { imageScaling, brightness, readingMode },
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

	const containerStyle = useCallback(
		({ height, width }: { height: number; width: number }) =>
			orientation === 'vertical' ? undefined : { height, width },
		[orientation],
	)

	useEffect(() => {
		const hasPageURL = !!search.get('page')
		if (hasPageURL) {
			search.delete('page')
			setSearch(search)
		}
	}, [search, setSearch])

	// TODO: use page dimensions to calculate the height of the page (if horizontal supports double spread)
	return (
		<div className="flex flex-1" data-overlayscrollbars-initialize ref={rootRef}>
			<AutoSizer>
				{({ height, width }) => (
					<Virtuoso
						key={readingMode}
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
									...containerStyle({ height, width }),
									filter: `brightness(${brightness * 100}%)`,
								}}
								className="flex flex-1 justify-center"
							>
								<Page
									page={currentIndex + 1}
									src={url}
									imageScaling={imageScaling}
									onPageClick={() => setSettings({ showToolBar: !showToolBar })}
								/>
							</div>
						)}
						rangeChanged={setVisibleRange}
						initialTopMostItemIndex={initialPage ? initialPage - 1 : undefined}
						overscan={{ main: preload.ahead || 1, reverse: preload.behind || 1 }}
					/>
				)}
			</AutoSizer>

			{/* TODO: this is actually incorrect, so lets just not display until it works right */}
			{/* <div className="fixed bottom-2 left-2 z-50 rounded-lg bg-black bg-opacity-75 px-2 py-1 text-white">
				{visibleRange.startIndex + 1}
			</div> */}
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

type PageProps = {
	page: number
	src: string
	imageScaling: BookImageScaling
	onPageClick: () => void
}
const Page = ({ page, src, imageScaling: { scaleToFit }, onPageClick }: PageProps) => (
	<EntityImage
		key={`page-${page}-scaled-${scaleToFit}`}
		className={cn(
			'z-30 select-none',
			{
				'mx-auto my-0 w-auto self-center': scaleToFit === 'none',
			},
			{
				'm-auto h-full max-h-screen w-auto object-cover': scaleToFit === 'height',
			},
			{
				'mx-auto my-0 w-full object-contain': scaleToFit === 'width',
			},
		)}
		src={src}
		onError={(err) => {
			// @ts-expect-error: is oke
			err.target.src = '/favicon.png'
		}}
		onClick={onPageClick}
	/>
)
