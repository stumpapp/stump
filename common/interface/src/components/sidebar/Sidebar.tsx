import clsx from 'clsx';
import { AnimatePresence } from 'framer-motion';
import { Books, CaretRight, Gear, House } from 'phosphor-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
import { useLibraries } from '@stump/client';
import { Library } from '@stump/core';

import { useLocale } from '../../hooks/useLocale';
import ApplicationVersion from '../ApplicationVersion';
import CreateLibraryModal from '../library/CreateLibraryModal';
import LibraryOptionsMenu from '../library/LibraryOptionsMenu';
import Logout from './Logout';
import ThemeToggle from './ThemeToggle';

interface NavMenuItemProps extends Library {
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
			<HStack
				as={Button}
				_focus={{
					boxShadow: '0 0 0 3px rgba(196, 130, 89, 0.6);',
				}}
				w="full"
				variant="ghost"
				justifyContent="space-between"
				alignItems="center"
				onClick={onToggle}
				p={2}
			>
				<div className="flex space-x-2">
					{/* @ts-ignore */}
					<rest.icon weight="fill" />
					<span>{name}</span>
				</div>
				<Box p={1} rounded="full">
					<CaretRight
						className={clsx(isOpen ? 'rotate-90' : 'rotate-270', 'transition-all duration-100')}
					/>
				</Box>
			</HStack>

			<AnimatePresence>
				{isOpen && (
					<>
						<Box my={2}>
							<CreateLibraryModal />
						</Box>

						<VStack mt={2} spacing={2}>
							{items!.map((item) => (
								<Box
									key={item.id}
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
									<HStack p={1.5} minH="40px">
										<Link to={item.href} className="w-full flex-1 pl-1 text-sm">
											{item.name}
										</Link>
										<LibraryOptionsMenu library={item} />
									</HStack>
								</Box>
							))}
						</VStack>
					</>
				)}
			</AnimatePresence>
		</Box>
	);
}

function NavItem({ name, href, ...rest }: NavItemProps) {
	return (
		<Button
			as={Link}
			_focus={{
				boxShadow: '0 0 0 3px rgba(196, 130, 89, 0.6);',
			}}
			to={href!}
			w="full"
			variant="ghost"
			textAlign="left"
			display="flex"
			p={2}
		>
			<div className="flex space-x-2 justify-start w-full">
				{/* @ts-ignore */}
				<rest.icon weight="fill" />
				<span>{name}</span>
			</div>
		</Button>
	);
}

export function SidebarContent() {
	const navigate = useNavigate();

	const { locale, t } = useLocale();

	const { libraries } = useLibraries();

	const links: Array<NavItemProps> = useMemo(
		() => [
			{ name: t('sidebar.buttons.home'), icon: House as any, href: '/' },
			{
				name: t('sidebar.buttons.libraries'),
				icon: Books as any,
				items: libraries?.map((library) => ({
					...library,
					href: `/libraries/${library.id}`,
				})),
			},
			{ name: t('sidebar.buttons.settings'), icon: Gear as any, href: '/settings' },
		],
		[libraries, locale],
	);

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
				<img src="/favicon.ico" className="h-14 w-14 object-scale-down" />
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

				<HStack>
					<Logout />
					<ThemeToggle />
				</HStack>
			</HStack>
		</>
	);
}

export default function Sidebar() {
	return (
		<Box
			display={{ base: 'none', md: 'initial' }}
			minH="100%"
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
				spacing={4}
			>
				<SidebarContent />
			</Stack>
		</Box>
	);
}
