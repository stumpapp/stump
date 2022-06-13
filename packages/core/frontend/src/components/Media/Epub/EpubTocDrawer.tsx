import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerOverlay,
	Stack,
	Text,
	useColorModeValue,
} from '@chakra-ui/react';
import { ListBullets } from 'phosphor-react';
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { IconButton } from '~components/ui/Button';

interface EpubTocDrawerProps {
	isOpen: boolean;
	onClose(): void;
	onOpen(): void;

	// TODO: TYPE THESE, has to work both with epubjs and streaming epub engine (not built yet)
	toc: any[];
	onSelect(tocItem: any): void;
}

export default function EpubTocDrawer({
	isOpen,
	onOpen,
	onClose,
	toc,
	onSelect,
}: EpubTocDrawerProps) {
	const location = useLocation();

	const btnRef = useRef(null);

	useEffect(() => {
		if (isOpen) {
			onClose();
		}
	}, [location]);

	function handleSelect(href: string) {
		onSelect(href);
		onClose();
	}

	return (
		<>
			<IconButton variant="ghost" ref={btnRef} onClick={onOpen}>
				<ListBullets className="text-lg" weight="regular" />
			</IconButton>

			<Drawer isOpen={isOpen} placement="left" onClose={onClose} finalFocusRef={btnRef}>
				<DrawerOverlay />
				<DrawerContent bg={useColorModeValue('white', 'gray.800')}>
					<Stack
						as={DrawerBody}
						display="flex"
						flexShrink={0}
						py={4}
						h="full"
						w="full"
						px={2}
						zIndex={10}
						spacing={4}
					>
						{toc?.map((item) => (
							<Text onClick={() => handleSelect(item.content)}>{item.label}</Text>
						))}
					</Stack>
				</DrawerContent>
			</Drawer>
		</>
	);
}
