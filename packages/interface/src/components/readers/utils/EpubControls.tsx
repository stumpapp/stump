import {
	Box,
	ButtonGroup,
	HStack,
	Spacer,
	Stack,
	Text,
	useBoolean,
	useColorModeValue,
	useDisclosure,
	VStack,
} from '@chakra-ui/react'
import type { Epub } from '@stump/types'
import { ArrowLeft, CaretLeft, CaretRight, MagnifyingGlass } from 'phosphor-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { SwipeableHandlers } from 'react-swipeable'

import Button, { IconButton } from '../../../ui/Button'
import EpubTocDrawer from './EpubTocDrawer'
import FontSelection from './FontSelection'

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

	const chapterColor = useColorModeValue('gray.700', 'gray.400')
	const entityColor = useColorModeValue('gray.700', 'gray.200')
	const { isOpen, onOpen, onClose } = useDisclosure()

	function handleMouseEnter() {
		if (!visible) {
			on()
		}
	}

	function handleMouseLeave() {
		if (visible && !isOpen) {
			setTimeout(() => {
				// TODO: need to check if still in div before shutting off
				off()
			}, 500)
		}
	}

	return (
		<Box
			px={4}
			// py={[2, 0]}
			h={10}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			position={['fixed', 'unset']}
			className="z-[100]"
		>
			<HStack
				pt={2}
				pb={[2, 2]}
				className="transition-opacity duration-150"
				opacity={visible || isOpen ? 1.0 : 0}
				bg={[useColorModeValue('white', 'gray.750'), 'transparent']}
				align="flex-start"
			>
				<ButtonGroup isAttached>
					{/* FIXME: This navigate(-3) is effectively going back three times.
						Likely related unwanted exta pushing on the routes stack when 
						opening an epub */}
					<IconButton variant="ghost" onClick={() => navigate(-3)}>
						<ArrowLeft className="text-lg" weight="regular" />
					</IconButton>

					<EpubTocDrawer
						isOpen={isOpen}
						onOpen={onOpen}
						onClose={onClose}
						toc={epub.toc}
						onSelect={goTo}
					/>
				</ButtonGroup>

				<Spacer />

				<VStack textAlign="center" spacing={0}>
					<Text color={entityColor} fontSize={['xs', 'sm']} noOfLines={1}>
						{epub.media_entity.name}
					</Text>
					{location.chapter && (
						<Text fontSize={['xs', 'sm']} noOfLines={1} color={chapterColor}>
							{location.chapter}
						</Text>
					)}
				</VStack>

				<Spacer />

				<ButtonGroup isAttached>
					<FontSelection changeFontSize={changeFontSize} fontSize={fontSize} />
					<IconButton variant="ghost" disabled>
						<MagnifyingGlass className="text-lg" weight="regular" />
					</IconButton>
				</ButtonGroup>
			</HStack>
		</Box>
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
		<Stack className="relative" h="full" w="full" bg={useColorModeValue('white', 'gray.750')}>
			<EpubHeaderControls
				fontSize={fontSize}
				changeFontSize={changeFontSize}
				location={location}
				epub={epub}
				goTo={controls.goTo}
			/>

			<HStack className="relative h-full w-full" p={4} pt={0}>
				<div
					className="fixed left-2 z-[100] hidden h-1/2 w-12 items-center md:flex"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button
						size="sm"
						display={['none', 'flex']}
						hidden={!visibleNav}
						variant="ghost"
						p={0}
						onClick={prev}
					>
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
					className="fixed right-2 z-[100] hidden h-1/2  w-12 items-center md:flex"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button
						size="sm"
						display={['none', 'flex']}
						hidden={!visibleNav}
						variant="ghost"
						p={0}
						onClick={next}
					>
						<CaretRight />
					</Button>
				</div>
			</HStack>
		</Stack>
	)
}
