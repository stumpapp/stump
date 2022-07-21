import React, { useEffect, useRef } from 'react';
import {
	Box,
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerOverlay,
	Heading,
	Stack,
	Text,
	useColorModeValue,
} from '@chakra-ui/react';
import { ListBullets } from 'phosphor-react';
import { useLocation } from 'react-router-dom';
import { IconButton } from '~ui/Button';
import { EpubContent } from '@stump/core';

interface EpubTocDrawerProps {
	isOpen: boolean;
	onClose(): void;
	onOpen(): void;

	// TODO: TYPE THESE, has to work both with epubjs and streaming epub engine (not built yet)
	toc: EpubContent[];
	onSelect(tocItem: string): void;
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
				<DrawerContent className="relative" bg={useColorModeValue('white', 'gray.800')}>
					<Box p={2} mt={2} className="sticky top-0">
						<Heading size="sm" textAlign="center">
							Table of Contents
						</Heading>
					</Box>
					<Stack
						as={DrawerBody}
						display="flex"
						flexShrink={0}
						py={4}
						h="full"
						w="full"
						px={4}
						zIndex={10}
						spacing={4}
						className="scrollbar-hide"
					>
						{toc?.map((item) => (
							<Text className="cursor-pointer" onClick={() => handleSelect(item.content)}>
								{item.label}
							</Text>
						))}
					</Stack>
				</DrawerContent>
			</Drawer>
		</>
	);
}
