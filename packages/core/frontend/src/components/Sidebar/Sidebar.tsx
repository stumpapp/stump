import clsx from 'clsx';
import { AnimatePresence } from 'framer-motion';
import { Books, CaretRight, Gear, House } from 'phosphor-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import shallow from 'zustand/shallow';
import { useStore } from '~store/store';

import {
	Box,
	Button,
	HStack,
	Stack,
	Text,
	useColorModeValue,
	useDisclosure,
	VStack,
} from '@chakra-ui/react';

import ApplicationVersion from '../ApplicationVersion';
import LibraryOptionsMenu from './LibraryOptionsMenu';
import ThemeToggle from '../ThemeToggle';

interface NavMenuItemProps {
	id: string;
	name: string;
	href: string;
}

interface NavItemProps {
	name: string;
	icon: React.ReactNode;
	onClick?: (href: string) => void;
	href?: string;
	items?: NavMenuItemProps[];
}

function NavMenuItem({ name, items, onClick, ...rest }: NavItemProps) {
	const { isOpen, onToggle } = useDisclosure();

	return (
		<Box w="full">
			<Button
				_focus={{
					boxShadow: '0 0 0 3px rgba(196, 130, 89, 0.6);',
				}}
				w="full"
				variant="ghost"
				onClick={onToggle}
				textAlign="left"
				p={2}
			>
				<HStack w="full" alignItems="center" justifyContent="space-between">
					<HStack spacing="2">
						{/* @ts-ignore */}
						<rest.icon />
						<span>{name}</span>
					</HStack>
					<Box p={1} rounded="full">
						<CaretRight
							className={clsx(isOpen ? 'rotate-90' : 'rotate-270', 'transition-all duration-100')}
						/>
					</Box>
				</HStack>
			</Button>

			<AnimatePresence>
				{isOpen && (
					<VStack mt={2} spacing={2}>
						{items!.map((item) => (
							<Box
								// as={motion.div}
								key={item.id}
								// TODO: fix color differences
								pl={6}
								w="full"
								rounded="md"
								color={{ _dark: 'gray.200', _light: 'gray.600' }}
								_hover={{
									color: 'gray.900',
									bg: 'gray.50',
									_dark: { bg: 'gray.700', color: 'gray.100' },
								}}
							>
								<HStack
									p={1.5}
									// className="cursor-pointer w-full flex items-center font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900 dark:hover:text-gray-300 transition-colors duration-100"
								>
									<Link to={item.href} className="w-full flex-1 pl-1 text-sm">
										{item.name}
									</Link>
									<LibraryOptionsMenu libraryId={item.id} />
								</HStack>
							</Box>
						))}
					</VStack>
				)}
			</AnimatePresence>
		</Box>
	);
}

function NavItem({ name, href, ...rest }: NavItemProps) {
	return (
		<Button
			_focus={{
				boxShadow: '0 0 0 3px rgba(196, 130, 89, 0.6);',
			}}
			as={Link}
			to={href!}
			w="full"
			variant="ghost"
			textAlign="left"
			p={2}
		>
			<HStack w="full" alignItems="center" justifyContent="space-between">
				<HStack spacing="2">
					{/* @ts-ignore */}
					<rest.icon />
					<span>{name}</span>
				</HStack>
			</HStack>
		</Button>
	);
}

export function SidebarContent() {
	const navigate = useNavigate();

	const libraries = useStore((state) => state.libraries, shallow);

	const links: Array<NavItemProps> = useMemo(
		() => [
			{ name: 'Home', icon: House as any, href: '/' },
			{
				name: 'Libraries',
				icon: Books as any,
				items: libraries.map((library) => ({
					...library,
					href: `/libraries/${library.id}`,
				})),
			},
			{ name: 'Settings', icon: Gear as any, href: '/settings' },
		],
		[libraries],
	);

	// This kinda makes me hate chakra
	return (
		<>
			<HStack
				as={Link}
				to="/"
				px={2}
				flexShrink={0}
				justifyContent="start"
				alignItems="center"
				spacing="4"
			>
				<img src="/stump-logo--irregular-xs.png" className="h-14 w-14 object-scale-down" />
				<Text
					bgGradient="linear(to-r, brand.600, brand.500)"
					bgClip="text"
					fontSize="2xl"
					fontWeight="bold"
					_dark={{
						bgGradient: 'linear(to-r, brand.600, brand.400)',
					}}
				>
					Stump
				</Text>
			</HStack>

			{/* TODO: this needs to scroll on 'overflow' */}
			<VStack spacing={2} flexGrow={1}>
				{links.map((link) =>
					link.items ? (
						<NavMenuItem key={link.name} {...link} onClick={(href) => navigate(href)} />
					) : (
						<NavItem key={link.name} {...link} />
					),
				)}
			</VStack>

			<HStack as="footer" px={2} alignItems="center" justifyContent="space-between">
				<ApplicationVersion />

				<ThemeToggle />
			</HStack>
		</>
	);
}

// TODO: mobile breakpoint is stinky
export default function Sidebar() {
	return (
		<Box
			display={{ base: 'none', md: 'initial' }}
			minH="100vh"
			bg={useColorModeValue('gray.100', 'gray.900')}
			as="aside"
		>
			<Stack
				display="flex"
				flexShrink={0}
				py={4}
				bg={useColorModeValue('white', 'gray.800')}
				borderRight="1px"
				borderRightColor={useColorModeValue('gray.200', 'gray.700')}
				w={52}
				h="full"
				px={2}
				zIndex={10}
			>
				<SidebarContent />
			</Stack>
		</Box>
	);
}
