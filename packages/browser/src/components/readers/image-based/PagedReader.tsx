import { mediaQueryKeys } from '@stump/api'
import { queryClient } from '@stump/client'
import type { Media } from '@stump/types'
import clsx from 'clsx'
import React, { memo, useCallback, useEffect, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Hotkey } from 'react-hotkeys-hook/dist/types'
import { useSwipeable } from 'react-swipeable'
import { useMediaMatch, useWindowSize } from 'rooks'

import { useDetectZoom } from '@/hooks/useDetectZoom'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { ImagePageDimensionRef, useImageBaseReaderContext } from './context'

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
		layout: { showToolBar, doubleSpread },
		setLayout,
		bookPreferences: { readingDirection },
	} = useBookPreferences({ book: media })

	const { pageDimensions, setDimensions } = useImageBaseReaderContext()
	/**
	 * A memoized callback to get the dimensions of a given page
	 */
	const getDimensions = useCallback((page: number) => pageDimensions[page], [pageDimensions])
	/**
	 * A memoized callback to set the dimensions of a given page
	 */
	const upsertDimensions = useCallback(
		(page: number, dimensions: ImagePageDimensionRef) => {
			setDimensions((prev) => ({
				...prev,
				[page]: dimensions,
			}))
		},
		[setDimensions],
	)

	const { innerWidth } = useWindowSize()
	const { isZoomed } = useDetectZoom()

	const isMobile = useMediaMatch('(max-width: 768px)')

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
	 * This effect is primarily responsible for two cleanup tasks:
	 *
	 * 1. Hiding the toolbar when the component unmounts. This is done to ensure that the toolbar is not
	 *    visible when the user navigates *back* to a reader again at some point.
	 * 2. Invalidating the in-progress media query when the component unmounts. This is done to ensure that
	 *    when the user navigates away from the reader, the in-progress media is accurately reflected with
	 *    the latest reading session.
	 */
	useEffect(() => {
		return () => {
			setLayout({
				showToolBar: false,
			})
			queryClient.invalidateQueries([mediaQueryKeys.getInProgressMedia], { exact: false })
		}
	}, [setLayout])

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
	// TODO: docs
	// TODO: these are kinda wrong, they need to be aware of if the doublespread is being overridden
	// by orientation of image
	const handleLeftwardPageChange = useCallback(() => {
		const direction = readingDirection === 'ltr' ? -1 : 1
		if (doubleSpread) {
			const adjustedForBounds = currentPage + direction * 2 < 1 ? 1 : currentPage + direction * 2
			doChangePage(adjustedForBounds)
		} else {
			doChangePage(currentPage + direction)
		}
	}, [readingDirection, doChangePage, currentPage, doubleSpread])
	// TODO: docs
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
					setLayout({
						showToolBar: !showToolBar,
					})
					break
				case 'escape':
					setLayout({
						showToolBar: false,
					})
					break
				default:
					break
			}
		},
		[setLayout, showToolBar, handleRightwardPageChange, handleLeftwardPageChange],
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

	const renderPages = useCallback(() => {
		const dimensionSet = displayedPages.map((page) => getDimensions(page))

		const shouldDisplayDoubleSpread =
			displayedPages.length > 1 &&
			dimensionSet.every((dimensions) => !dimensions || dimensions.isPortrait)

		if (shouldDisplayDoubleSpread) {
			return (
				<div className="flex h-full justify-center">
					{displayedPages.map((page) => (
						<img
							key={`double-spread-${page}`}
							className="z-30 max-h-screen w-full select-none md:w-auto"
							src={getPageUrl(page)}
							onLoad={(e) => {
								const img = e.target as HTMLImageElement
								upsertDimensions(page, {
									height: img.height,
									isPortrait: img.height > img.width,
									width: img.width,
								})
							}}
							onError={(err) => {
								// @ts-expect-error: is oke
								err.target.src = '/favicon.png'
							}}
							onClick={() =>
								setLayout({
									showToolBar: !showToolBar,
								})
							}
						/>
					))}
				</div>
			)
		} else {
			return (
				<img
					className="z-30 max-h-screen w-full select-none md:w-auto"
					src={getPageUrl(currentPage)}
					onLoad={(e) => {
						const img = e.target as HTMLImageElement
						upsertDimensions(currentPage, {
							height: img.height,
							isPortrait: img.height > img.width,
							width: img.width,
						})
					}}
					onError={(err) => {
						// @ts-expect-error: is oke
						err.target.src = '/favicon.png'
					}}
					onClick={() =>
						setLayout({
							showToolBar: !showToolBar,
						})
					}
				/>
			)
		}
	}, [displayedPages, currentPage, getPageUrl, setLayout, showToolBar])

	// TODO: when preloading images, cache the dimensions of the images to better support dynamic resizing
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

			{renderPages()}

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
