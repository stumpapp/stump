import { mediaQueryKeys } from '@stump/api'
import { queryClient } from '@stump/client'
import { useBoolean } from '@stump/components'
import type { Media } from '@stump/types'
import clsx from 'clsx'
import React, { memo, useEffect, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { usePreloadPage } from '@/hooks/usePreloadPage'

import Toolbar from './Toolbar'

const DEFAULT_PRELOAD_COUNT = 4

export type PagedReaderProps = {
	/** The current page which the reader should render */
	currentPage: number
	/** The media entity associated with the reader */
	media: Media
	/** A callback that is called in order to change the page */
	onPageChange?: (page: number) => void
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

	const [toolbarVisible, { toggle: toggleToolbar, off: hideToolbar }] = useBoolean(false)

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

	/**
	 * This effect is responsible for updating the current page ref when the current page changes. This was
	 * added primarily because of the useHotKeys hook below.
	 */
	useEffect(() => {
		currentPageRef.current = currentPage
	}, [currentPage])

	/**
	 * This effect is responsibe for invalidating the in-progress media query when the component unmounts.
	 * This is done to ensure that when the user navigates away from the reader, the in-progress media is
	 * accurately reflected with the latest reading session.
	 *
	 * Note: This honestly isn't needed, as the cache time is not long enough to warrant this. However, I
	 * like being cautious.
	 */
	useEffect(() => {
		return () => {
			queryClient.invalidateQueries([mediaQueryKeys.getInProgressMedia])
		}
	}, [])

	/**
	 * A simple function that does a little bit of validation before calling the onPageChange callback.
	 * This is done to prevent the user from going to a page that doesn't exist.
	 *
	 * @param newPage The new page to navigate to (1-indexed)
	 */
	function handlePageChange(newPage: number) {
		if (newPage <= media.pages && newPage > 0) {
			onPageChange?.(newPage)
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
				toggleToolbar()
				break
			case 'escape':
				hideToolbar()
				break
			default:
				break
		}
	})

	return (
		<div className="relative flex h-full items-center justify-center">
			<Toolbar
				title={media.name}
				currentPage={currentPage}
				pages={media.pages}
				visible={toolbarVisible}
				onPageChange={handlePageChange}
			/>
			<SideBarControl position="left" onClick={() => handlePageChange(currentPage - 1)} />
			{/* TODO: better error handling for the loaded image */}
			<img
				className="z-30 max-h-full w-full select-none md:w-auto"
				src={getPageUrl(currentPage)}
				onError={(err) => {
					// @ts-expect-error: is oke
					err.target.src = '/favicon.png'
				}}
				onClick={toggleToolbar}
			/>
			<SideBarControl position="right" onClick={() => handlePageChange(currentPage + 1)} />
		</div>
	)
}

type SideBarControlProps = {
	/** A callback that is called when the sidebar is clicked */
	onClick: () => void
	/** The position of the sidebar control */
	position: 'left' | 'right'
}

/**
 * A component that renders an invisible div on either the left or right side of the screen that, when
 * clicked, will call the onClick callback. This is used in the `PagedReader` component for
 * navigating to the next/previous page.
 */
function SideBarControl({ onClick, position }: SideBarControlProps) {
	return (
		<div
			className={clsx(
				'z-50 h-full border border-transparent transition-all duration-300',
				'absolute w-[10%] active:border-edge-200 active:bg-background-200  active:bg-opacity-50',
				'sm:relative sm:flex sm:w-full sm:flex-shrink',
				{ 'right-0': position === 'right' },
				{ 'left-0': position === 'left' },
			)}
			onClick={onClick}
		/>
	)
}

export default memo(PagedReader)
