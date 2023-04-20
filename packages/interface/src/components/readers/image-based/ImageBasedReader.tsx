import { queryClient } from '@stump/client'
import { useBoolean } from '@stump/components'
import type { Media } from '@stump/types'
import clsx from 'clsx'
import React, { useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import Toolbar from './Toolbar'

export type ImageBasedReaderProps = {
	currentPage: number
	media: Media
	onPageChange: (page: number) => void
	getPageUrl(page: number): string
}

export default function ImageBasedReader({
	currentPage,
	media,
	onPageChange,
	getPageUrl,
}: ImageBasedReaderProps) {
	const currPageRef = React.useRef(currentPage)

	const [toolbarVisible, { toggle: toggleToolbar, off: hideToolbar }] = useBoolean(false)

	// TODO: is this enough?
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

	useEffect(() => {
		currPageRef.current = currentPage
	}, [currentPage])

	useEffect(() => {
		return () => {
			queryClient.invalidateQueries(['getInProgressMedia'])
		}
	}, [])

	function handlePageChange(newPage: number) {
		if (newPage < media.pages && newPage > 0) {
			onPageChange(newPage)
		}
	}

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
	onClick: () => void
	position: 'left' | 'right'
}
function SideBarControl({ onClick, position }: SideBarControlProps) {
	return (
		<div
			className={clsx(
				'z-50 h-full border border-transparent transition-all duration-300',
				'absolute w-[10%] active:border-gray-100 active:bg-gray-200 dark:active:border dark:active:border-gray-500 dark:active:bg-gray-700',
				'sm:relative sm:flex sm:w-full sm:flex-shrink sm:active:bg-transparent',
				{ 'right-0': position === 'right' },
				{ 'left-0': position === 'left' },
			)}
			onClick={onClick}
		/>
	)
}
