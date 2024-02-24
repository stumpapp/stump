import { useReaderStore } from '@stump/client'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useWindowSize } from 'rooks'

import { PagedReaderProps } from './PagedReader'

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
export default function AnimatedPagedReader({
	currentPage,
	media,
	onPageChange,
	getPageUrl,
}: PagedReaderProps) {
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

	const { showToolBar, setShowToolBar } = useReaderStore((state) => ({
		setShowToolBar: state.setShowToolBar,
		showToolBar: state.showToolBar,
	}))

	// This is for the hotkeys
	const currPageRef = useRef(currentPage)

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

	useHotkeys('right, left, space, escape', (_, handler) => {
		const targetKey = handler.keys?.at(0)
		switch (targetKey) {
			case 'right':
				handleHotKeyPagination('next')
				break
			case 'left':
				handleHotKeyPagination('prev')
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

	return (
		<>
			{imageUrls[0] && (
				<motion.img
					ref={prevRef}
					animate={prevControls}
					transition={{ ease: 'easeOut' }}
					style={{ x: prevX }}
					className="absolute max-h-full w-full md:w-auto"
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
				className="absolute z-30 max-h-full w-full md:w-auto"
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
					className="absolute max-h-full w-full md:w-auto"
					src={imageUrls[2]}
					onError={(err) => {
						// @ts-expect-error: is oke
						err.target.src = '/favicon.png'
					}}
				/>
			)}
		</>
	)
}

// export default function AnimatedPagedReader({
// 	media,
// 	currentPage,
// 	getPageUrl,
// 	onPageChange,
// }: PagedReaderProps) {
// 	const pageCount = media.pages
// 	// Calculate the indexes of the currently visible pages
// 	const startIndex = currentPage - 2 >= 1 ? currentPage - 2 : 0
// 	const endIndex = startIndex + 3 >= pageCount ? pageCount - 1 : startIndex + 3

// 	// Set up motion values for the swipe animation
// 	const x = useMotionValue(0)
// 	const pageWidth = useTransform(x, [0, 1], [0, -100 / pageCount])

// 	// Handle swipe navigation
// 	const handleSwipe = (event, info) => {
// 		if (info.offset.x > 0 && currentPage > 1) {
// 			// setCurrentPage(currentPage - 1)
// 			onPageChange(currentPage - 1)
// 		} else if (info.offset.x < 0 && currentPage < pageCount) {
// 			// setCurrentPage(currentPage + 1)
// 			onPageChange(currentPage + 1)
// 		}
// 	}

// 	return (
// 		<div className="relative flex h-full w-full items-center justify-center">
// 			{Array.from({ length: pageCount })
// 				.slice(startIndex, endIndex + 1)
// 				.map((_, index) => (
// 					<motion.img
// 						className="z-30 max-h-full w-full select-none md:w-auto"
// 						key={index}
// 						src={getPageUrl(startIndex + index + 1)}
// 						alt={`Page ${startIndex + index + 1}`}
// 						drag="x"
// 						dragConstraints={{ left: 0, right: 0 }}
// 						dragElastic={1}
// 						dragMomentum={false}
// 						onDragEnd={handleSwipe}
// 						style={{ x: index === 1 ? x : pageWidth }}
// 					/>
// 				))}
// 		</div>
// 	)
// }
