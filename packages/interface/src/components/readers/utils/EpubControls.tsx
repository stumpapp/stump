import { Button, cx, IconButton, Spacer, Text, useBoolean } from '@stump/components'
import type { Epub } from '@stump/types'
import { ArrowLeft, CaretLeft, CaretRight, MagnifyingGlass } from 'phosphor-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { SwipeableHandlers } from 'react-swipeable'

import EpubTocDrawer from './EpubTocDrawer'
import FontSelection from './FontSelection'

// FIXME: I briefly worked on this file to remove chakra, but it needs a LOT of work.
// it is very ugly. stinky doody code, too.

interface IEpubControls {
	next(): Promise<void>
	prev(): Promise<void>
	goTo(href: string): void
	changeFontSize(size: number): void
}

interface EpubControlsProps {
	controls: IEpubControls
	fontSize: number
	swipeHandlers: SwipeableHandlers
	// FIXME: type this
	/* eslint-disable @typescript-eslint/no-explicit-any */
	location: any
	children: React.ReactNode
	epub: Epub
}

interface HeaderControlsProps
	extends Pick<IEpubControls, 'changeFontSize' | 'goTo'>,
		Pick<EpubControlsProps, 'location' | 'epub' | 'fontSize'> {}

function EpubHeaderControls({
	changeFontSize,
	fontSize,
	location,
	epub,
	goTo,
}: HeaderControlsProps) {
	const navigate = useNavigate()

	const [visible, { on, off }] = useBoolean(false)

	const [isOpen, drawerActions] = useBoolean(false)

	function handleMouseEnter() {
		on()
	}

	function handleMouseLeave() {
		if (visible && !isOpen) {
			setTimeout(() => {
				// I think this just requires two states: isHovering an isOpen...
				// TODO: need to check if still in div before shutting off
				off()
			}, 500)
		}
	}

	return (
		<div
			className="fixed z-[100] h-10 w-full"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div
				className={cx(
					'flex items-center gap-1 bg-white pt-2 pb-2 transition-opacity duration-150 dark:bg-gray-800 md:bg-transparent',
					visible || isOpen ? 'opacity-100' : 'opacity-0',
				)}
			>
				{/* FIXME: This navigate(-3) is effectively going back three times.
						Likely related unwanted exta pushing on the routes stack when 
						opening an epub */}
				<IconButton variant="ghost" onClick={() => navigate(-3)}>
					<ArrowLeft className="text-lg" weight="regular" />
				</IconButton>

				<EpubTocDrawer
					isOpen={isOpen}
					onOpen={drawerActions.on}
					onClose={drawerActions.off}
					toc={epub.toc}
					onSelect={goTo}
				/>

				<Spacer />

				<div className="flex flex-col text-center">
					<Text size="sm" className="line-clamp-1">
						{epub.media_entity.name}
					</Text>
					{location.chapter && (
						<Text size="sm" className="line-clamp-1">
							{location.chapter}
						</Text>
					)}
				</div>

				<Spacer />

				<div>
					<FontSelection changeFontSize={changeFontSize} fontSize={fontSize} />
					<IconButton variant="ghost" disabled>
						<MagnifyingGlass className="text-lg" weight="regular" />
					</IconButton>
				</div>
			</div>
		</div>
	)
}

export default function EpubControls({
	children,
	controls,
	fontSize,
	swipeHandlers,
	location,
	epub,
}: EpubControlsProps) {
	const [visibleNav, { on: showNav, off: hideNav }] = useBoolean(true)

	const { prev, next, changeFontSize } = controls

	function handleMouseEnterNav() {
		if (!visibleNav) {
			showNav()
		}
	}

	function handleMouseLeaveNav() {
		if (visibleNav) {
			hideNav()
		}
	}

	function handleTapEvent(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		// if tap is really close to right edge of screen, next page
		if (e.clientX > window.innerWidth - 75) {
			next()
		} else if (e.clientX < 75) {
			// if tap is really close to left edge of screen, previous page
			prev()
		}
	}

	return (
		<div className="relative flex h-full w-full flex-col gap-1">
			<EpubHeaderControls
				fontSize={fontSize}
				changeFontSize={changeFontSize}
				location={location}
				epub={epub}
				goTo={controls.goTo}
			/>

			<div className="relative flex h-full w-full items-center gap-1">
				<div
					className="fixed left-2 z-[100] hidden h-1/2 w-12 items-center md:flex"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button size="sm" className={cx({ hidden: !visibleNav })} variant="ghost" onClick={prev}>
						<CaretLeft />
					</Button>
				</div>
				<div
					className="fixed inset-0 z-[99] md:hidden"
					{...swipeHandlers}
					onClick={handleTapEvent}
				/>
				{children}
				<div
					className="fixed right-2 z-[100] hidden h-1/2 w-12 items-center justify-end md:flex"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button size="sm" className={cx({ hidden: !visibleNav })} variant="ghost" onClick={next}>
						<CaretRight />
					</Button>
				</div>
			</div>
		</div>
	)
}
