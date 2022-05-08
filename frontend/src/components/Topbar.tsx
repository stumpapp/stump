import React from 'react';
import { Box, Heading, HStack, useColorModeValue } from '@chakra-ui/react';
import { CaretLeft, CaretRight } from 'phosphor-react';
import Button from './ui/Button';
import { useNavigate } from 'react-router-dom';
import Search from './Search';
import { useStore } from '~store/store';
import shallow from 'zustand/shallow';
import MobileDrawer from './Sidebar/MobileDrawer';

// TODO: fix navigation, I don't necessarily want native navigation here. I want to be able to disable the
// buttons if theres is no forward/backward history. If I am on /books/id/pages/page, and I click the back button on
// that page to take me to /boos/id, I don't want the back button to go to /books/id/pages/page.
function Navigation() {
	const navigate = useNavigate();

	return (
		<HStack
			// >:( this won't work, probably some annoying thing with parent stack
			// ml={0}
			style={{ margin: 0 }}
			spacing={1.5}
			alignItems="center"
			display={{ base: 'none', md: 'flex' }}
		>
			<Button
				variant="ghost"
				p="0.5"
				size="sm"
				_hover={{ bg: useColorModeValue('gray.200', 'gray.750') }}
				onClick={() => navigate(-1)}
			>
				<CaretLeft />
			</Button>

			<Button
				variant="ghost"
				p="0.5"
				size="sm"
				_hover={{ bg: useColorModeValue('gray.200', 'gray.750') }}
				onClick={() => navigate(1)}
			>
				<CaretRight />
			</Button>
		</HStack>
	);
}

export default function Topbar() {
	const title = useStore((state) => state.title, shallow);

	// TODO: make sticky? or just fixed?
	return (
		<Box
			as="nav"
			className="grid grid-cols-12 gap-4 w-full items-center px-4 md:pb-0 md:pt-4 pt-2 pb-2"
			bg={{ base: useColorModeValue('white', 'gray.800'), md: 'transparent' }}
		>
			<HStack
				spacing="4"
				className="flex col-span-6 md:col-span-3 justify-start items-center self-center"
			>
				<MobileDrawer />

				<Navigation />

				{/* @ts-ignore: this seems to work, idky it has type error */}
				<Heading as="h3" size={{ base: 'sm', md: 'md' }} isTruncated>
					{title}
				</Heading>
			</HStack>

			<div className="flex w-full col-span-6 justify-end items-center md:justify-center">
				<Search />
			</div>

			<div className="md:flex md:col-span-3 items-center justify-end hidden">todo</div>
		</Box>
	);
}
