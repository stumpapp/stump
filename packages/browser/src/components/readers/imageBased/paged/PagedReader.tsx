import Panzoom from '@panzoom/panzoom'
import type { Media } from '@stump/sdk'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Hotkey } from 'react-hotkeys-hook/dist/types'
import { useMediaMatch, useWindowSize } from 'rooks'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
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
		bookPreferences: { tapSidesToNavigate, imageScaling, secondPageSeparate, doublePageBehavior },
		settings: { showToolBar },
		setSettings,
	} = useBookPreferences({ book: media })

	const { pageSets } = useImageBaseReaderContext()

	const { innerWidth } = useWindowSize()

	const isMobile = useMediaMatch('(max-width: 768px)')

	const pageSetRef = useRef<HTMLDivElement | null>(null)
	const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null)

	const panningDetected = useRef(false)

	const [pageSetWidth, setPageSetWidth] = useState(0)
	useEffect(() => {
		const pageSetElement = pageSetRef.current
		if (!pageSetElement) return

		const resizeObserver = new ResizeObserver((entries) => {
			if (!entries[0]) return
			const newWidth = entries[0].contentRect.width
			setPageSetWidth(newWidth)
		})
		resizeObserver.observe(pageSetElement)
		return () => {
			resizeObserver.disconnect()
		}
	}, [])

	useEffect(() => {
		const pageSetElement = pageSetRef.current
		if (!pageSetElement) return

		const parentElement = pageSetElement.parentElement
		if (!parentElement) return

		/**
		 * Set up event handlers for pointer clicking and scroll wheel
		 */
		const setupEventHandlers = (pz: ReturnType<typeof Panzoom>) => {
			const handleWheel = (event: WheelEvent) => {
				if (event.ctrlKey) {
					pz.zoomWithWheel(event)
				}
			}

			// Check panning vs clicking
			let startX = 0
			let startY = 0
			const handlePointerDown = (event: PointerEvent) => {
				if (event.button === 2) return

				startX = event.clientX
				startY = event.clientY

				const isSidebarClicked = !!(event.target as HTMLElement).closest('.z-50')

				if (!isSidebarClicked) {
					pz.handleDown(event)
					parentElement.style.cursor = 'move'
					pageSetElement.style.cursor = 'move'
					event.preventDefault()
				}
			}
			const handlePointerUp = (event: PointerEvent) => {
				const deltaX = event.clientX - startX
				const deltaY = event.clientY - startY
				pz.handleUp(event)
				parentElement.style.cursor = 'default'
				pageSetElement.style.cursor = 'default'
				panningDetected.current = Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2
				setTimeout(() => {
					panningDetected.current = false
				}, 100)
			}

			parentElement.removeEventListener('wheel', handleWheel)
			parentElement.removeEventListener('pointerdown', handlePointerDown)
			document.removeEventListener('pointermove', pz.handleMove)
			document.removeEventListener('pointerup', handlePointerUp)

			parentElement.addEventListener('wheel', handleWheel)
			parentElement.addEventListener('pointerdown', handlePointerDown)
			document.addEventListener('pointermove', pz.handleMove)
			document.addEventListener('pointerup', handlePointerUp)
		}

		/**
		 * A function that manually calculates the correct panzoom origin
		 * due to the default origin setting being wrong
		 */
		const panzoomOriginCalculation = () => {
			const viewportWidth = window.innerWidth
			const xOrigin = (1 - viewportWidth / (2 * pageSetWidth)) * 100
			const origin = `${xOrigin}% 50%`
			return origin
		}

		const createAndConfigurePanzoom = () => {
			if (panzoomRef.current) {
				panzoomRef.current.destroy()
			}

			const pz = Panzoom(pageSetElement, {
				noBind: true,
				cursor: 'default',
				minScale: 0.8,
				maxScale: 2.5,
				origin: panzoomOriginCalculation(),
			})

			panzoomRef.current = pz
			setupEventHandlers(pz)
		}

		createAndConfigurePanzoom()

		window.addEventListener('resize', createAndConfigurePanzoom)

		return () => {
			window.removeEventListener('resize', createAndConfigurePanzoom)
			// The others are already removed inside createAndConfigurePanzoom
			panzoomRef.current?.destroy()
		}
	}, [currentPage, imageScaling, secondPageSeparate, doublePageBehavior, pageSetWidth])

	const currentSetIdx = useMemo(
		() => pageSets.findIndex((set) => set.includes(currentPage - 1)),
		[currentPage, pageSets],
	)

	/**
	 * If the image parts are collective >= 86% of the screen width, we want to fix the side navigation
	 */
	const fixSideNavigation = useMemo(() => {
		return (!!innerWidth && pageSetWidth >= innerWidth * 0.86) || isMobile
	}, [pageSetWidth, innerWidth, isMobile])

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

	/**
	 * A callback to change the page to the left. This will respect the reading direction
	 * and the double spread setting.
	 */
	const handleLeftwardPageChange = useCallback(() => {
		const nextSetIdx = currentSetIdx - 1
		const nextSet = pageSets[nextSetIdx]
		const endOfNextSet = nextSet?.at(-1)

		if (!nextSet || endOfNextSet == null || panningDetected.current) {
			return
		}

		if (nextSetIdx >= 0 && nextSetIdx < pageSets.length) {
			doChangePage(endOfNextSet + 1)
		}
	}, [doChangePage, currentSetIdx, pageSets])
	/**
	 * A callback to change the page to the right. This will respect the reading direction
	 * and the double spread setting.
	 */
	const handleRightwardPageChange = useCallback(() => {
		const nextSetIdx = currentSetIdx + 1
		const nextSet = pageSets[nextSetIdx]
		const startOfNextSet = nextSet?.at(0)

		if (!nextSet || startOfNextSet == null || panningDetected.current) {
			return
		}

		if (nextSetIdx >= 0 && nextSetIdx < pageSets.length) {
			doChangePage(startOfNextSet + 1)
		}
	}, [doChangePage, currentSetIdx, pageSets])

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

	const unconstrainedWidth =
		imageScaling.scaleToFit === 'height' || imageScaling.scaleToFit === 'none'

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				margin: 'auto',
				minWidth: '100%',
				width: unconstrainedWidth ? 'max-content' : '100%',
			}}
		>
			{!showToolBar && tapSidesToNavigate && (
				<SideBarControl
					fixed={fixSideNavigation}
					position="left"
					onClick={() => handleLeftwardPageChange()}
				/>
			)}

			<PageSet
				ref={pageSetRef}
				currentPage={currentPage}
				getPageUrl={getPageUrl}
				onPageClick={() => {
					if (!panningDetected.current) {
						setSettings({ showToolBar: !showToolBar })
					}
				}}
			/>

			{!showToolBar && tapSidesToNavigate && (
				<SideBarControl
					fixed={fixSideNavigation}
					position="right"
					onClick={() => handleRightwardPageChange()}
				/>
			)}
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
				'z-50 mt-[-50vh] h-[150vh] shrink-0 border border-transparent transition-all duration-300',
				'active:border-edge-subtle active:bg-background-surface active:bg-opacity-50',
				fixed ? 'fixed w-[10%]' : 'relative mx-[-3%] flex flex-1 flex-grow',
				{ 'right-0': position === 'right' },
				{ 'left-0': position === 'left' },
			)}
			onClick={onClick}
		/>
	)
}

export default memo(PagedReader)
