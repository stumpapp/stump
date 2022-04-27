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
	// const { isOpen, setDrawer } = useStore(({ libraryDrawer, setLibraryDrawer }) => ({
	// 	isOpen: libraryDrawer,
	// 	setDrawer: setLibraryDrawer,
	// }));

	// FIXME: this is now persisted, however there is a terrible flash that bothers the heck
	// out of me on inital render...
	// const { onToggle } = useDisclosure({
	// 	isOpen,
	// 	onOpen: () => setDrawer(true),
	// 	onClose: () => setDrawer(false),
	// });

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
		<Button w="full" variant="ghost" textAlign="left" p={2}>
			<HStack as={Link} to={href!} w="full" alignItems="center" justifyContent="space-between">
				<HStack spacing="2">
					{/* @ts-ignore */}
					<rest.icon />
					<span>{name}</span>
				</HStack>
			</HStack>
		</Button>
	);
}

function SidebarContent() {
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

	return (
		<Stack
			display="flex"
			flexShrink={0}
			py={4}
			bg={useColorModeValue('white', 'gray.800')}
			borderRight="1px"
			borderRightColor={useColorModeValue('gray.200', 'gray.700')}
			w={{ base: 20, md: 52 }}
			h="full"
			px={2}
			zIndex={10}
		>
			<HStack px={2} flexShrink={0} justifyContent="start" alignItems="center" spacing="4">
				<img src="/favicon.png" width="40" height="40" />
				<Text
					bgGradient="linear(to-r, brand.600, brand.400)"
					bgClip="text"
					fontSize="2xl"
					fontWeight="bold"
					_dark={{
						bgGradient: 'linear(to-r, brand.600, brand.200)',
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
		</Stack>
	);
}

// TODO: mobile breakpoint is stinky
export default function Sidebar() {
	return (
		<Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')} as="aside">
			<SidebarContent />
			{/* <Box ml={{ base: 24, md: 60 }} p="4">
				{children}
			</Box> */}
		</Box>
	);
}
