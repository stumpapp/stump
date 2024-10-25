import type { Media } from '@stump/sdk'
import clsx from 'clsx'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Hotkey } from 'react-hotkeys-hook/dist/types'
import { useSwipeable } from 'react-swipeable'
import { useMediaMatch, useWindowSize } from 'rooks'

import { useDetectZoom } from '@/hooks/useDetectZoom'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { ImagePageDimensionRef, useImageBaseReaderContext } from '../context'
import PageSet from './PageSet'

export type PagedReaderProps = {
	/** The current page which the reader should render */
	currentPage: number
	/** The media entity associated with the reader */
	media: Media
	/** A callback that is called in order to change the page */
	onPageChange: (page: number) => void
	/** A function that returns the url for a given page */
	getPageUrl(page: number): string
}

/**
 * A reader component for image-based media. Images are displayed one at a time,
 * however preloading is done to reduce wait times for consecutive pages.
 *
 * Note: This component lacks animations between pages. The `AnimatedPagedReader` component
 * will have animations between pages, but is currently a WIP
 */
function PagedReader({ currentPage, media, onPageChange, getPageUrl }: PagedReaderProps) {
	const {
		settings: { showToolBar },
		setSettings,
		bookPreferences: { readingDirection, doubleSpread },
	} = useBookPreferences({ book: media })

	const { pageDimensions } = useImageBaseReaderContext()
	/**
	 * A memoized callback to get the dimensions of a given page
	 */
	const getDimensions = useCallback((page: number) => pageDimensions[page], [pageDimensions])

	const { innerWidth } = useWindowSize()
	const { isZoomed } = useDetectZoom()

	const isMobile = useMediaMatch('(max-width: 768px)')

	const pageSetRef = useRef<HTMLDivElement | null>(null)

	// TODO: this needs to be aware of overflow / if the page is too small to render double spread
	const displayedPages = useMemo(
		() =>
			doubleSpread ? [currentPage, currentPage + 1].filter((p) => p <= media.pages) : [currentPage],
		[currentPage, doubleSpread, media.pages],
	)

	/**
	 * If the image parts are collective >= 80% of the screen width, we want to fix the side navigation
	 */
	const fixSideNavigation = useMemo(() => {
		const dimensionSet = displayedPages
			.map((page) => getDimensions(page))
			.filter(Boolean) as ImagePageDimensionRef[]
		const totalWidth = dimensionSet.reduce((acc, dimensions) => acc + dimensions.width, 0)

		return (!!innerWidth && totalWidth >= innerWidth * 0.8) || isMobile
	}, [displayedPages, getDimensions, innerWidth, isMobile])

	/**
	 * A callback to actually change the page. This should not be called directly, but rather
	 * through the `handleLeftwardPageChange` and `handleRightwardPageChange` callbacks to
	 * ensure that the reading direction is respected.
	 *
	 * @param newPage The new page to navigate to (1-indexed)
	 */
	const doChangePage = useCallback(
		(newPage: number) => {
			if (newPage <= media.pages && newPage > 0) {
				onPageChange(newPage)
			}
		},
		[media.pages, onPageChange],
	)
	// TODO: once the UI here is 'smarter' and knows when a double spread isn't feasible, the math needs to be adjusted
	/**
	 * A callback to change the page to the left. This will respect the reading direction
	 * and the double spread setting.
	 */
	const handleLeftwardPageChange = useCallback(() => {
		const direction = readingDirection === 'ltr' ? -1 : 1
		if (doubleSpread) {
			const adjustedForBounds = currentPage + direction * 2 < 1 ? 1 : currentPage + direction * 2
			doChangePage(adjustedForBounds)
		} else {
			doChangePage(currentPage + direction)
		}
	}, [readingDirection, doChangePage, currentPage, doubleSpread])
	/**
	 * A callback to change the page to the right. This will respect the reading direction
	 * and the double spread setting.
	 */
	const handleRightwardPageChange = useCallback(() => {
		const direction = readingDirection === 'ltr' ? 1 : -1
		if (doubleSpread) {
			const adjustedForBounds =
				currentPage + direction * 2 > media.pages ? media.pages : currentPage + direction * 2
			doChangePage(adjustedForBounds)
		} else {
			doChangePage(currentPage + direction)
		}
	}, [readingDirection, doChangePage, currentPage, doubleSpread, media.pages])

	/**
	 * A callback handler for changing the page or toggling the toolbar visibility via
	 * keyboard shortcuts.
	 */
	const hotKeyHandler = useCallback(
		(hotkey: Hotkey) => {
			const targetKey = hotkey.keys?.at(0)
			switch (targetKey) {
				case 'right':
					handleRightwardPageChange()
					break
				case 'left':
					handleLeftwardPageChange()
					break
				case 'space':
					setSettings({
						showToolBar: !showToolBar,
					})
					break
				case 'escape':
					setSettings({
						showToolBar: false,
					})
					break
				default:
					break
			}
		},
		[setSettings, showToolBar, handleRightwardPageChange, handleLeftwardPageChange],
	)
	/**
	 * Register the hotkeys for the reader component
	 */
	useHotkeys('right, left, space, escape', (_, handler) => hotKeyHandler(handler))

	const swipeHandlers = useSwipeable({
		delta: 150,
		onSwipedLeft: handleLeftwardPageChange,
		onSwipedRight: handleRightwardPageChange,
		preventScrollOnSwipe: true,
	})
	const swipeEnabled = useMemo(
		() => !isZoomed && !showToolBar && isMobile,
		[isZoomed, showToolBar, isMobile],
	)

	return (
		<div
			className="relative flex h-full w-full items-center justify-center"
			{...(swipeEnabled ? swipeHandlers : {})}
		>
			<SideBarControl
				fixed={fixSideNavigation}
				position="left"
				onClick={() => handleLeftwardPageChange()}
			/>

			<PageSet
				ref={pageSetRef}
				currentPage={currentPage}
				displayedPages={displayedPages}
				getPageUrl={getPageUrl}
				onPageClick={() => setSettings({ showToolBar: !showToolBar })}
			/>

			<SideBarControl
				fixed={fixSideNavigation}
				position="right"
				onClick={() => handleRightwardPageChange()}
			/>
		</div>
	)
}

type SideBarControlProps = {
	/** A callback that is called when the sidebar is clicked */
	onClick: () => void
	/** The position of the sidebar control */
	position: 'left' | 'right'
	/** Whether the sidebar should be fixed to the screen */
	fixed: boolean
}

/**
 * A component that renders an invisible div on either the left or right side of the screen that, when
 * clicked, will call the onClick callback. This is used in the `PagedReader` component for
 * navigating to the next/previous page.
 */
function SideBarControl({ onClick, position, fixed }: SideBarControlProps) {
	return (
		<div
			className={clsx(
				'z-50 h-full shrink-0 border border-transparent transition-all duration-300 active:border-edge-subtle active:bg-background-surface active:bg-opacity-50',
				fixed ? 'fixed w-[10%]' : 'relative flex flex-1 flex-grow',
				{ 'right-0': position === 'right' },
				{ 'left-0': position === 'left' },
			)}
			onClick={onClick}
		/>
	)
}

export default memo(PagedReader)
