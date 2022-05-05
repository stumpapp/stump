import React from 'react';
import { Heading, HStack, useColorModeValue } from '@chakra-ui/react';
import { CaretLeft, CaretRight } from 'phosphor-react';
import Button from './ui/Button';
import { useNavigate } from 'react-router-dom';
import Search from './Search';
import { useStore } from '~store/store';
import shallow from 'zustand/shallow';

// TODO: fix navigation, I don't necessarily want native navigation here. I want to be able to disable the
// buttons if theres is no forward/backward history. If I am on /books/id/pages/page, and I click the back button on
// that page to take me to /boos/id, I don't want the back button to go to /books/id/pages/page.
function Navigation() {
	const navigate = useNavigate();

	return (
		<HStack spacing={1.5}>
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

	return (
		<nav className="grid grid-cols-12 gap-4 w-full items-center px-4 pt-4">
			<HStack spacing="4" className="col-span-3 self-start items-center">
				<Navigation />
				<Heading as="h3" size="md">
					{title}
				</Heading>
			</HStack>

			<div className="flex w-full col-span-6 items-center justify-center">
				<Search />
			</div>

			<div className="flex col-span-3 items-center justify-end">todo</div>
		</nav>
	);
}
