import {
	Box,
	ButtonGroup,
	HStack,
	Spacer,
	Stack,
	Text,
	useBoolean,
	useColorModeValue,
} from '@chakra-ui/react';
import {
	ArrowLeft,
	CaretLeft,
	CaretRight,
	ListBullets,
	MagnifyingGlass,
	TextAa,
} from 'phosphor-react';
import React from 'react';
import Button, { IconButton } from '~components/ui/Button';

interface IEpubControls {
	next(): Promise<void>;
	prev(): Promise<void>;
	changeFontSize(size: string): void;
}

interface EpubControlsProps {
	controls: IEpubControls;
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
			py={2}
			px={4}
			h={10}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			className="z-[1000]"
		>
			<HStack visibility={visible ? 'visible' : 'hidden'}>
				<ButtonGroup isAttached>
					<IconButton variant="ghost">
						<ArrowLeft className="text-lg" weight="regular" />
					</IconButton>
					<IconButton variant="ghost">
						<ListBullets className="text-lg" weight="regular" />
					</IconButton>
				</ButtonGroup>

				<Spacer />

				<Text>{title}</Text>

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

export default function EpubControls({ children, controls, location, media }: EpubControlsProps) {
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

	return (
		<Stack className="relative" h="full" w="full" bg={useColorModeValue('white', 'gray.750')}>
			{/* TODO: pull title from metadata instead? Not sure. */}
			<EpubHeaderControls changeFontSize={changeFontSize} location={location} title={media.name} />

			<HStack
				className="relative h-full w-full"
				p={4}
				// bg={useColorModeValue('white', 'gray.750')}
			>
				<div
					className="fixed left-2 z-[100] h-full flex items-center w-12"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button hidden={!visibleNav} variant="ghost" p={0} onClick={prev}>
						<CaretLeft />
					</Button>
				</div>
				{children}
				<div
					className="fixed right-2 z-[100] h-full flex items-center w-12"
					onMouseEnter={handleMouseEnterNav}
					onMouseLeave={handleMouseLeaveNav}
				>
					<Button hidden={!visibleNav} variant="ghost" p={0} onClick={next}>
						<CaretRight />
					</Button>
				</div>
			</HStack>
		</Stack>
	);
}
