 
// TODO: remove this when I have time, fix the icon types
import { Box, useDisclosure } from '@chakra-ui/react'
import { refreshUseLibrary, useLibraries } from '@stump/client'
import { Button, ButtonOrLink, cn, ContextMenu, Heading } from '@stump/components'
import type { Library } from '@stump/types'
import clsx from 'clsx'
import { AnimatePresence } from 'framer-motion'
import {
	type LucideProps,
	ChevronRight,
	ExternalLink,
	Home,
	Library as LibraryIcon,
	Settings,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useLocale } from '../../hooks/useLocale'
import ApplicationVersion from '../ApplicationVersion'
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
	// type should be a component that takes svg props
	icon: (props: LucideProps) => JSX.Element
	onClick?: (href: string) => void
	href?: string
	items?: NavMenuItemProps[]
	active?: boolean
}

function NavMenuItem({ name, items, ...rest }: NavItemProps) {
	const { isOpen, onToggle } = useDisclosure()

	const Icon = rest.icon

	return (
		<>
			<Button
				variant="ghost"
				className="flex w-full items-center justify-between"
				size="lg"
				onClick={onToggle}
				pressEffect={false}
			>
				<div className="flex items-center space-x-2">
					<Icon className="h-5 w-5" />
					<span>{name}</span>
				</div>
				<Box p={1} rounded="full">
					<ChevronRight
						className={clsx(
							isOpen ? 'rotate-90' : 'rotate-270',
							'h-4 w-4 transition-all duration-100',
						)}
					/>
				</Box>
			</Button>

			<AnimatePresence>
				{isOpen && (
					<div className="max-h-full w-full">
						<ButtonOrLink
							className="w-full text-center hover:bg-gray-75"
							variant="outline"
							href="/libraries/create"
							size="md"
						>
							Create Library
						</ButtonOrLink>

						<div className="mt-2 flex max-h-full flex-col gap-2 overflow-y-scroll scrollbar-hide">
							{items!.map(({ onHover, active, ...item }) => (
								<div
									key={item.id}
									className={cn(
										'w-full rounded-md text-gray-600 hover:bg-gray-75 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-100',
										{ 'bg-gray-50 dark:bg-gray-750': active },
									)}
								>
									<div className="flex max-h-[40px] items-center py-2 px-4">
										<Link
											to={item.href}
											className="w-full flex-1 pl-1 text-sm"
											onMouseEnter={onHover}
										>
											{item.name}
										</Link>
										<LibraryOptionsMenu library={item} />
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</AnimatePresence>
		</>
	)
}

function NavItem({ name, href, active, ...rest }: NavItemProps) {
	const Icon = rest.icon

	return (
		<ButtonOrLink
			size="lg"
			className={clsx('flex w-full justify-start', { 'bg-gray-50 dark:bg-gray-850': active })}
			href={href}
			variant="ghost"
		>
			<div className="flex items-center space-x-2">
				<Icon className="h-5 w-5" />
				<span>{name}</span>
			</div>
		</ButtonOrLink>
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
			{ href: '/', icon: Home, name: t('sidebar.buttons.home') },
			{
				icon: LibraryIcon,
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
				icon: Settings,
				name: t('sidebar.buttons.settings'),
				// onHover:  () => queryClient.prefetchQuery([])
			},
		],

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[libraries, locale, location.pathname],
	)

	return (
		<>
			<div className="flex items-center justify-between px-4">
				<Link to="/" className="flex shrink-0 items-center justify-start gap-2">
					<img src="/assets/favicon.ico" className="h-6 w-6 object-scale-down" />
					<Heading
						size="xs"
						className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent"
					>
						Stump
					</Heading>
				</Link>

				<NavigationButtons />
			</div>

			<div className="flex max-h-full grow flex-col gap-2 overflow-hidden p-1">
				{links.map((link) =>
					link.items ? (
						<NavMenuItem key={link.name} {...link} onClick={(href) => navigate(href)} />
					) : (
						<NavItem key={link.name} {...link} active={linkIsActive(link.href)} />
					),
				)}
			</div>

			<footer className="flex items-center justify-between px-2">
				<ApplicationVersion />

				<div className="flex items-center gap-2">
					<Logout />
					<ThemeToggle />
				</div>
			</footer>
		</>
	)
}

export default function Sidebar() {
	return (
		<aside className="hidden min-h-full md:inline-block">
			<div className="relative z-10 flex h-full w-56 shrink-0 flex-col gap-4 border-r border-gray-75 py-4 px-2 dark:border-gray-900 dark:bg-gray-1000">
				<SidebarContent />
			</div>
		</aside>
	)
}
