import { useBoolean } from '@chakra-ui/react'
import { queryClient } from '@stump/client'
import type { Media } from '@stump/types'
import clsx from 'clsx'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import React, { useEffect, useMemo, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useWindowSize } from 'rooks'

import Toolbar from './utils/Toolbar'
export interface ImageBasedReaderProps {
	currentPage: number
	media: Media

	onPageChange: (page: number) => void
	getPageUrl(page: number): string
}

// TODO: merge with AnimatedImageBasedReader once animates aren't ass
// TODO: obviously mobile pretty much doesn't work really. I'll fix that later
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

	useHotkeys('right, left, space, esc', (_, handler) => {
		switch (handler.key) {
			case 'right':
				handlePageChange(currPageRef.current + 1)
				break
			case 'left':
				handlePageChange(currPageRef.current - 1)
				break
			case 'space':
				toggleToolbar()
				break
			case 'esc':
				hideToolbar()
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
				className="w-full max-h-full md:w-auto z-30"
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
				'h-full transition-all duration-300 z-50 border border-transparent',
				'absolute w-[10%] active:bg-gray-200 active:border-gray-100 dark:active:bg-gray-700 dark:active:border dark:active:border-gray-500',
				'sm:relative sm:w-full sm:flex sm:flex-shrink sm:active:bg-transparent',
				{ 'right-0': position === 'right' },
				{ 'left-0': position === 'left' },
			)}
			onClick={onClick}
		/>
	)
}

const RESET_CONTROLS = {
	x: '0%',
}

const FORWARD_START_ANIMATION = {
	transition: {
		duration: 0.35,
	},
	x: '-200%',
}

const TO_CENTER_ANIMATION = {
	transition: {
		duration: 0.35,
	},
	x: 0,
}

const BACKWARD_START_ANIMATION = {
	transition: {
		duration: 0.35,
	},
	x: '200%',
}

// FIXME: its much better overall, Works very well on portrait images, still a little stuttering
// when moving between images of different aspect ratios. (e.g. portrait vs landscape). A little
// funky on mobile still but not nearly as bad.
// FIXME: animation on mobile without drag looks bad
// TODO: slow down the animations to test better
// TODO: kill me, and then make the animations togglable
export function AnimatedImageBasedReader({
	currentPage,
	media,
	onPageChange,
	getPageUrl,
}: ImageBasedReaderProps) {
	const { innerWidth } = useWindowSize()

	const prevRef = useRef<HTMLImageElement>(null)
	const nextRef = useRef<HTMLImageElement>(null)

	const x = useMotionValue(0)

	const nextX = useTransform(x, (latest) => {
		if (nextRef.current) {
			// Only time this will happen is when no motion is happening, or a swipe right
			// to go to previous page is happening.
			if (latest >= 0) {
				return latest
			}

			const center = (innerWidth ?? 0) / 2
			const imageWidth = nextRef.current.width

			const imageCenter = imageWidth / 2

			const centerPosition = center + imageCenter

			// latest will be 0 at the start, and go negative as we swipe
			// left.
			if (Math.abs(latest) >= centerPosition) {
				return -centerPosition
			}
		}

		return latest
	})

	const prevX = useTransform(x, (latest) => {
		if (prevRef.current) {
			// Only time this will happen is when no motion is happening, or a swipe left
			// to go to next page is happening.
			if (latest <= 0) {
				return latest
			}

			const center = (innerWidth ?? 0) / 2
			const imageWidth = prevRef.current.width

			const imageCenter = imageWidth / 2

			const centerPosition = center + imageCenter

			// latest will be 0 at the start, and go positive as we swipe
			// left.
			if (latest >= centerPosition) {
				return centerPosition
			}
		}

		return latest
	})

	const controls = useAnimation()
	const nextControls = useAnimation()
	const prevControls = useAnimation()

	const [toolbarVisible, { toggle: toggleToolbar, off: hideToolbar }] = useBoolean(false)

	// This is for the hotkeys
	const currPageRef = React.useRef(currentPage)

	useEffect(() => {
		currPageRef.current = currentPage
	}, [currentPage])

	const imageUrls = useMemo(
		() => {
			const urls = []

			// if has previous
			if (currentPage > 1) {
				urls.push(getPageUrl(currentPage - 1))
			} else {
				urls.push(undefined)
			}

			urls.push(getPageUrl(currentPage))

			// if has next
			if (currentPage < media.pages) {
				urls.push(getPageUrl(currentPage + 1))
			} else {
				urls.push(undefined)
			}

			return urls
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentPage],
	)

	function startNextPageAnimation() {
		Promise.all([
			controls.start(FORWARD_START_ANIMATION),
			nextControls.start(TO_CENTER_ANIMATION),
		]).then(() => {
			onPageChange(currPageRef.current + 1)
		})
	}

	function startPrevPageAnimation() {
		Promise.all([
			controls.start(BACKWARD_START_ANIMATION),
			prevControls.start(TO_CENTER_ANIMATION),
		]).then(() => {
			onPageChange(currPageRef.current - 1)
		})
	}

	useEffect(
		() => {
			controls.set(RESET_CONTROLS)
			nextControls.set({ left: '100%' })
			prevControls.set({ right: '100%' })
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentPage],
	)

	function handleHotKeyPagination(direction: 'next' | 'prev') {
		if (direction === 'next' && currPageRef.current < media.pages) {
			startNextPageAnimation()
		} else if (direction === 'prev' && currPageRef.current > 1) {
			startPrevPageAnimation()
		}
	}

	useHotkeys('right, left, space, esc', (_, handler) => {
		switch (handler.key) {
			case 'right':
				handleHotKeyPagination('next')
				break
			case 'left':
				handleHotKeyPagination('prev')
				break
			case 'space':
				toggleToolbar()
				break
			case 'esc':
				hideToolbar()
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
				onPageChange={() => alert('TODO;')}
			/>

			{imageUrls[0] && (
				<motion.img
					ref={prevRef}
					animate={prevControls}
					transition={{ ease: 'easeOut' }}
					style={{ x: prevX }}
					className="absolute w-full max-h-full md:w-auto"
					src={imageUrls[0]}
					onError={(err) => {
						// @ts-expect-error: is oke
						err.target.src = '/src/favicon.png'
					}}
				/>
			)}

			<motion.img
				animate={controls}
				drag="x"
				dragElastic={1}
				dragConstraints={{ left: 0, right: 0 }}
				onDragEnd={(_e, info) => {
					const { velocity, offset } = info

					if ((velocity.x <= -200 || offset.x <= -300) && currPageRef.current < media.pages) {
						startNextPageAnimation()
					} else if ((velocity.x >= 200 || offset.x >= 300) && currPageRef.current > 1) {
						startPrevPageAnimation()
					}
				}}
				transition={{ ease: 'easeOut' }}
				style={{ x }}
				className="absolute w-full max-h-full md:w-auto z-30"
				src={imageUrls[1]}
				onError={(err) => {
					// @ts-expect-error: is oke
					err.target.src = '/favicon.png'
				}}
				// TODO: figure this out, I can't do this anymore with the drag...
				// onClick={toggleToolbar}
			/>

			{imageUrls[2] && (
				<motion.img
					ref={nextRef}
					animate={nextControls}
					transition={{ ease: 'easeOut' }}
					style={{ x: nextX }}
					className="absolute w-full max-h-full md:w-auto"
					src={imageUrls[2]}
					onError={(err) => {
						// @ts-expect-error: is oke
						err.target.src = '/favicon.png'
					}}
				/>
			)}
		</div>
	)
}
