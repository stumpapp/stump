import { mediaQueryKeys } from '@stump/api'
import { queryClient } from '@stump/client'
import type { Media } from '@stump/types'
import clsx from 'clsx'
import React, { memo, useEffect, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useSwipeable } from 'react-swipeable'
import { useMediaMatch, useWindowSize } from 'rooks'

import { useDetectZoom } from '@/hooks/useDetectZoom'
import { useReaderStore } from '@/stores'

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
	const currentPageRef = React.useRef(currentPage)

	const { showToolBar, setShowToolBar } = useReaderStore((state) => ({
		setShowToolBar: state.setShowToolBar,
		showToolBar: state.showToolBar,
	}))
	const { innerWidth } = useWindowSize()
	const { isZoomed } = useDetectZoom()

	const isMobile = useMediaMatch('(max-width: 768px)')
	const [imageWidth, setImageWidth] = React.useState<number | null>(null)
	/**
	 * If the image width is >= 80% of the screen width, we want to fix the side navigation
	 */
	const fixSideNavigation = useMemo(() => {
		if (imageWidth && innerWidth) {
			return imageWidth >= innerWidth * 0.8
		} else {
			return isMobile
		}
	}, [imageWidth, innerWidth, isMobile])

	/**
	 * This effect is responsible for updating the current page ref when the current page changes. This was
	 * added primarily because of the useHotKeys hook below.
	 */
	useEffect(() => {
		currentPageRef.current = currentPage
	}, [currentPage])

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
			setShowToolBar(false)
			queryClient.invalidateQueries([mediaQueryKeys.getInProgressMedia], { exact: false })
		}
	}, [setShowToolBar])

	/**
	 * A simple function that does a little bit of validation before calling the onPageChange callback.
	 * This is done to prevent the user from going to a page that doesn't exist.
	 *
	 * @param newPage The new page to navigate to (1-indexed)
	 */
	function handlePageChange(newPage: number) {
		if (newPage <= media.pages && newPage > 0) {
			onPageChange(newPage)
		}
	}

	/**
	 * This hook is responsible for handling the hotkeys for the reader. The hotkeys are as follows:
	 * - right arrow: go to the next page
	 * - left arrow: go to the previous page
	 * - space: toggle the toolbar
	 * - escape: hide the toolbar
	 */
	useHotkeys('right, left, space, escape', (_, handler) => {
		const targetKey = handler.keys?.at(0)
		switch (targetKey) {
			case 'right':
				handlePageChange(currentPageRef.current + 1)
				break
			case 'left':
				handlePageChange(currentPageRef.current - 1)
				break
			case 'space':
				setShowToolBar(!showToolBar)
				break
			case 'escape':
				setShowToolBar(false)
				break
			default:
				break
		}
	})

	const swipeHandlers = useSwipeable({
		delta: 150,
		onSwipedLeft: () => handlePageChange(currentPage + 1),
		onSwipedRight: () => handlePageChange(currentPage - 1),
		preventScrollOnSwipe: true,
	})
	const swipeEnabled = useMemo(
		() => !isZoomed && !showToolBar && isMobile,
		[isZoomed, showToolBar, isMobile],
	)

	// TODO: when preloading images, cache the dimensions of the images to better support dynamic resizing
	return (
		<div
			className="relative flex h-full w-full items-center justify-center"
			{...(swipeEnabled ? swipeHandlers : {})}
		>
			<SideBarControl
				fixed={fixSideNavigation}
				position="left"
				onClick={() => handlePageChange(currentPage - 1)}
			/>
			{/* TODO: better error handling for the loaded image */}
			<img
				className="z-30 max-h-screen w-full select-none md:w-auto"
				src={getPageUrl(currentPage)}
				onLoad={(e) => {
					const img = e.target as HTMLImageElement
					setImageWidth(img.width)
				}}
				onError={(err) => {
					// @ts-expect-error: is oke
					err.target.src = '/favicon.png'
				}}
				onClick={() => setShowToolBar(!showToolBar)}
			/>
			<SideBarControl
				fixed={fixSideNavigation}
				position="right"
				onClick={() => handlePageChange(currentPage + 1)}
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
