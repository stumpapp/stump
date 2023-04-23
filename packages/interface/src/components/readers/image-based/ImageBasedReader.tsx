import { mediaQueryKeys } from '@stump/api'
import { queryClient } from '@stump/client'
import { useBoolean } from '@stump/components'
import type { Media } from '@stump/types'
import clsx from 'clsx'
import React, { useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import Toolbar from './Toolbar'

export type ImageBasedReaderProps = {
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
 * A component that renders a reader for image-based media. Images are displayed one at a time,
 * however preloading is done to reduce wait times for consecutive pages.
 *
 * Note: This component lacks animations between pages. The `AnimatedImageBasedReader` component
 * has animations, as the name suggests lol.
 */
export default function ImageBasedReader({
	currentPage,
	media,
	onPageChange,
	getPageUrl,
}: ImageBasedReaderProps) {
	const currPageRef = React.useRef(currentPage)

	const [toolbarVisible, { toggle: toggleToolbar, off: hideToolbar }] = useBoolean(false)

	/**
	 * This effect is responsible for preloading the next 2 pages relative to the current page. This is done to
	 * try and prevent wait times for the next page to load.
	 */
	useEffect(
		() => {
			const pageArray = Array.from({ length: media.pages })

			const start = currentPage >= 1 ? currentPage - 1 : 0

			pageArray.slice(start, 3).forEach((_, i) => {
				const preloadedImg = new Image()
				preloadedImg.src = getPageUrl(currentPage + (i + 1))
			})
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentPage, media.pages],
	)

	/**
	 * This effect is responsible for updating the current page ref when the current page changes. This was
	 * added primarily because of the useHotKeys hook below.
	 */
	useEffect(() => {
		currPageRef.current = currentPage
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
	 * @param newPage The new page to navigate to
	 */
	function handlePageChange(newPage: number) {
		if (newPage < media.pages && newPage > 0) {
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
				handlePageChange(currPageRef.current + 1)
				break
			case 'left':
				handlePageChange(currPageRef.current - 1)
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
			<SideBarControl position="left" onClick={() => onPageChange(currentPage - 1)} />
			<img
				className="z-30 max-h-full w-full select-none md:w-auto"
				src={getPageUrl(currentPage)}
				onError={(err) => {
					// @ts-expect-error: is oke
					err.target.src = '/favicon.png'
				}}
				onClick={toggleToolbar}
			/>
			<SideBarControl position="right" onClick={() => onPageChange(currentPage + 1)} />
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
 * clicked, will call the onClick callback. This is used in the `ImageBasedReader` component for
 * navigating to the next/previous page.
 */
function SideBarControl({ onClick, position }: SideBarControlProps) {
	return (
		<div
			className={clsx(
				'z-50 h-full border border-transparent transition-all duration-300',
				'absolute w-[10%] active:border-gray-100 active:bg-gray-100 active:bg-opacity-50 dark:active:border dark:active:border-gray-500 dark:active:bg-gray-700 dark:active:bg-opacity-30',
				'sm:relative sm:flex sm:w-full sm:flex-shrink',
				{ 'right-0': position === 'right' },
				{ 'left-0': position === 'left' },
			)}
			onClick={onClick}
		/>
	)
}
