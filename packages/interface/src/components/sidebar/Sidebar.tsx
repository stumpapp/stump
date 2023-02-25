/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: remove this when I have time, fix the icon types
import {
	Box,
	Button,
	HStack,
	Stack,
	Text,
	useColorModeValue,
	useDisclosure,
	VStack,
} from '@chakra-ui/react'
import { refreshUseLibrary, useLibraries } from '@stump/client'
import type { Library } from '@stump/types'
import clsx from 'clsx'
import { AnimatePresence } from 'framer-motion'
import { Books, CaretRight, Gear, House } from 'phosphor-react'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useLocale } from '../../hooks/useLocale'
import ApplicationVersion from '../ApplicationVersion'
import CreateLibraryModal from '../library/CreateLibraryModal'
import LibraryOptionsMenu from '../library/LibraryOptionsMenu'
import NavigationButtons from '../topbar/NavigationButtons'
import Logout from './Logout'
import ThemeToggle from './ThemeToggle'

interface NavMenuItemProps extends Library {
	active: boolean
	href: string
	onHover?: () => void
}

interface NavItemProps {
	name: string
	icon: React.ReactNode
	onClick?: (href: string) => void
	href?: string
	items?: NavMenuItemProps[]
	active?: boolean
}

function NavMenuItem({ name, items, ...rest }: NavItemProps) {
	const { isOpen, onToggle } = useDisclosure()

	const activeBgColor = useColorModeValue('gray.50', 'gray.750')

	return (
		<>
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
					{/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
					{/* @ts-ignore: TODO: fixme */}
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
					<Box w="full" maxH="full">
						<Box my={2}>
							<CreateLibraryModal />
						</Box>

						<VStack mt={2} spacing={2} maxH="full" overflow="scroll" className="scrollbar-hide">
							{items!.map(({ onHover, active, ...item }) => (
								<Box
									key={item.id}
									pl={6}
									w="full"
									rounded="md"
									color={{ _dark: 'gray.200', _light: 'gray.600' }}
									_hover={{
										_dark: { bg: 'gray.700', color: 'gray.100' },
										bg: 'gray.75',
										color: 'gray.900',
									}}
									bg={active ? activeBgColor : undefined}
								>
									<HStack p={1.5} minH="40px">
										<Link
											to={item.href}
											className="w-full flex-1 pl-1 text-sm"
											onMouseEnter={onHover}
										>
											{item.name}
										</Link>
										<LibraryOptionsMenu library={item} />
									</HStack>
								</Box>
							))}
						</VStack>
					</Box>
				)}
			</AnimatePresence>
		</>
	)
}

function NavItem({ name, href, active, ...rest }: NavItemProps) {
	const activeBgColor = useColorModeValue('gray.50', 'gray.750')

	return (
		<Button
			as={Link}
			_focus={{
				boxShadow: '0 0 0 3px rgba(196, 130, 89, 0.6);',
			}}
			to={href!}
			w="full"
			variant="ghost"
			bg={active ? activeBgColor : undefined}
			textAlign="left"
			display="flex"
			p={2}
		>
			<div className="flex space-x-2 justify-start w-full">
				{/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
				{/* @ts-ignore: TODO: fixme */}
				<rest.icon weight="fill" />
				<span>{name}</span>
			</div>
		</Button>
	)
}

export function SidebarContent() {
	const location = useLocation()
	const navigate = useNavigate()

	const { locale, t } = useLocale()
	const { libraries } = useLibraries()

	// TODO: I'd like to also highlight the library when viewing an item from it.
	// e.g. a book from the library, or a book from a series in the library, etc
	const libraryIsActive = (id: string) => location.pathname.startsWith(`/libraries/${id}`)
	const linkIsActive = (href?: string) => {
		if (!href) {
			return false
		} else if (href === '/') {
			return location.pathname === '/'
		}

		return location.pathname.startsWith(href)
	}

	const links: Array<NavItemProps> = useMemo(
		() => [
			{ href: '/', icon: House as any, name: t('sidebar.buttons.home') },
			{
				icon: Books as any,
				items: libraries?.map((library) => ({
					...library,
					active: libraryIsActive(library.id),
					href: `/libraries/${library.id}`,
					onHover: () => refreshUseLibrary(library.id),
				})),
				name: t('sidebar.buttons.libraries'),
			},
			{
				href: '/settings',
				icon: Gear as any,
				name: t('sidebar.buttons.settings'),
				// onHover:  () => queryClient.prefetchQuery([])
			},
		],

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[libraries, locale, location.pathname],
	)

	return (
		<>
			<HStack px={2} justifyContent="space-between" alignItems="center">
				<HStack as={Link} to="/" flexShrink={0} justifyContent="start" alignItems="center">
					<img src="/assets/favicon.ico" className="h-6 w-6 object-scale-down" />
					<Text
						bgGradient="linear(to-r, brand.600, brand.500)"
						bgClip="text"
						fontSize="md"
						fontWeight="bold"
						_dark={{
							bgGradient: 'linear(to-r, brand.600, brand.400)',
						}}
					>
						Stump
					</Text>
				</HStack>

				<NavigationButtons />
			</HStack>

			<VStack spacing={2} flexGrow={1} maxH="full" overflow="hidden" p={1}>
				{links.map((link) =>
					link.items ? (
						<NavMenuItem key={link.name} {...link} onClick={(href) => navigate(href)} />
					) : (
						<NavItem key={link.name} {...link} active={linkIsActive(link.href)} />
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
	)
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
				w={56}
				h="full"
				px={2}
				zIndex={10}
				spacing={4}
				className="relative"
			>
				<SidebarContent />
			</Stack>
		</Box>
	)
}
