import React from 'react';
import {
	Box,
	ButtonGroup,
	HStack,
	Spacer,
	Stack,
	Text,
	useBoolean,
	useColorModeValue,
	VStack,
} from '@chakra-ui/react';
import {
	ArrowLeft,
	CaretLeft,
	CaretRight,
	ListBullets,
	MagnifyingGlass,
	TextAa,
} from 'phosphor-react';
import Button, { IconButton } from '~components/ui/Button';
import { SwipeableHandlers } from 'react-swipeable';

interface IEpubControls {
	next(): Promise<void>;
	prev(): Promise<void>;
	changeFontSize(size: string): void;
}

interface EpubControlsProps {
	controls: IEpubControls;
	swipeHandlers: SwipeableHandlers;
	location: any;
	children: React.ReactNode;
	media: Media;
}

interface HeaderControlsProps
	extends Pick<IEpubControls, 'changeFontSize'>,
		Pick<EpubControlsProps, 'location'> {
	title: string;
}

function EpubHeaderControls({ changeFontSize, location, title }: HeaderControlsProps) {
	const [visible, { on, off }] = useBoolean(false);

	function handleMouseEnter() {
		if (!visible) {
			on();
		}
	}

	function handleMouseLeave() {
		if (visible) {
			setTimeout(() => {
				// TODO: need to check if still in div before shutting off
				off();
			}, 500);
		}
	}

	return (
		<Box
			px={4}
			h={10}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			className="z-[1000]"
		>
			<HStack
				pt={2}
				pb={[0, 2]}
				className="transition-opacity duration-150"
				opacity={visible ? 1.0 : 0}
				align="flex-start"
			>
				<ButtonGroup isAttached>
					<IconButton variant="ghost">
						<ArrowLeft className="text-lg" weight="regular" />
					</IconButton>
					<IconButton variant="ghost">
						<ListBullets className="text-lg" weight="regular" />
					</IconButton>
				</ButtonGroup>

				<Spacer />

				<VStack textAlign="center" spacing={0}>
					<Text
						color={useColorModeValue('gray.700', 'gray.200')}
						fontSize={['xs', 'sm']}
						noOfLines={1}
					>
						{title}
					</Text>
					{location.chapter && (
						<Text
							fontSize={['xs', 'sm']}
							noOfLines={1}
							color={useColorModeValue('gray.700', 'gray.400')}
						>
							{location.chapter}
						</Text>
					)}
				</VStack>

				<Spacer />

				<ButtonGroup isAttached>
					<IconButton variant="ghost">
						<TextAa className="text-lg" weight="regular" />
					</IconButton>
					<IconButton variant="ghost">
						<MagnifyingGlass className="text-lg" weight="regular" />
					</IconButton>
				</ButtonGroup>
			</HStack>
		</Box>
	);
}

export default function EpubControls({
	children,
	controls,
	swipeHandlers,
	location,
	media,
}: EpubControlsProps) {
	const [visibleNav, { on: showNav, off: hideNav }] = useBoolean(true);

	const { prev, next, changeFontSize } = controls;

	function handleMouseEnterNav() {
		if (!visibleNav) {
			showNav();
		}
	}

	function handleMouseLeaveNav() {
		if (visibleNav) {
			hideNav();
		}
	}

	function handleTapEvent(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		// if tap is really close to right edge of screen, next page
		if (e.clientX > window.innerWidth - 75) {
			next();
		} else if (e.clientX < 75) {
			// if tap is really close to left edge of screen, previous page
			prev();
		}
	}

	return (
		<Stack className="relative" h="full" w="full" bg={useColorModeValue('white', 'gray.750')}>
			<EpubHeaderControls changeFontSize={changeFontSize} location={location} title={media.name} />

			<HStack className="relative h-full w-full" p={4} pt={0}>
				<div
					className="hidden fixed left-2 z-[100] h-full md:flex items-center w-12"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button
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
					className="hidden fixed right-2 z-[100] h-full md:flex items-center w-12"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button
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
	);
}
