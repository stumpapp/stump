import { refreshUseLibrary, useAppProps, useLibraries } from '@stump/client'
import { Button, ButtonOrLink, cn, Heading, Spacer, useBoolean } from '@stump/components'
import type { Library } from '@stump/types'
import clsx from 'clsx'
import { AnimatePresence } from 'framer-motion'
import {
	ChevronRight,
	Home,
	Library as LibraryIcon,
	List,
	type LucideProps,
	Settings,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAppContext } from '../../context'
import { useLocaleContext } from '../../i18n/context'
import ApplicationVersion from '../ApplicationVersion'
import NavigationButtons from '../topbar/NavigationButtons'
import LibraryOptionsMenu from './LibraryOptionsMenu'
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

// TODO: make this NOT library specific.
function NavMenuItem({ name, items, active, ...rest }: NavItemProps) {
	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()

	const [isOpen, { toggle }] = useBoolean()

	const Icon = rest.icon

	return (
		<>
			<Button
				variant="ghost"
				className="flex w-full items-center justify-between"
				size="lg"
				onClick={toggle}
				pressEffect={false}
			>
				<div className="flex items-center space-x-2">
					<Icon className="h-5 w-5" />
					<span>{name}</span>
				</div>
				<div className="rounded-full p-1">
					<ChevronRight
						className={clsx(
							isOpen ? 'rotate-90' : 'rotate-270',
							'h-4 w-4 transition-all duration-100',
						)}
					/>
				</div>
			</Button>

			<AnimatePresence>
				{isOpen && (
					<div className="max-h-full w-full">
						{/* TODO: disabled state looks not disabled */}
						{isServerOwner && (
							<ButtonOrLink
								href="/library/create"
								disabled={active}
								className="w-full text-center hover:bg-gray-75"
								variant="outline"
								size="md"
							>
								{t('sidebar.buttons.createLibrary')}
							</ButtonOrLink>
						)}

						<div className="mt-2 flex max-h-full flex-col gap-2 overflow-y-scroll scrollbar-hide">
							{items!.map(({ onHover, active, ...item }) => (
								<div
									key={item.id}
									className={cn(
										'w-full rounded-md text-gray-800 hover:bg-gray-75 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-100',
										{ 'bg-gray-50 dark:bg-gray-750': active },
									)}
								>
									<div className="flex max-h-[40px] items-center px-4 py-2">
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
			href={href}
			size="lg"
			className={clsx('flex w-full justify-start', { 'bg-gray-50 dark:bg-gray-850': active })}
			variant="ghost"
		>
			<div className="flex items-center space-x-2">
				<Icon className="h-5 w-5" />
				<span>{name}</span>
			</div>
		</ButtonOrLink>
	)
}

export function SidebarHeader() {
	const isBrowser = useAppProps()?.platform === 'browser'

	return (
		<div className="flex items-center justify-between px-4">
			<Link to="/" className="flex shrink-0 items-center justify-start gap-2">
				<img src="/assets/favicon.ico" className="h-6 w-6 object-scale-down" />
				<Heading variant="gradient" size="xs">
					Stump
				</Heading>
			</Link>

			{!isBrowser && <NavigationButtons />}
		</div>
	)
}

type SidebarContentProps = {
	isMobileSheet?: boolean
}

export function SidebarContent({ isMobileSheet = false }: SidebarContentProps) {
	const location = useLocation()
	const navigate = useNavigate()

	const { t } = useLocaleContext()
	const { libraries } = useLibraries()

	// TODO: I'd like to also highlight the library when viewing an item from it.
	// e.g. a book from the library, or a book from a series in the library, etc
	const linkIsActive = (href?: string) => {
		if (!href) {
			return false
		} else if (href === '/') {
			return location.pathname === '/'
		}

		return location.pathname.startsWith(href)
	}

	const links: Array<NavItemProps> = useMemo(() => {
		const libraryIsActive = (id: string) => location.pathname.startsWith(`/library/${id}`)

		return [
			{ href: '/', icon: Home, name: t('sidebar.buttons.home') },
			{
				active: location.pathname === 'library/create',
				icon: LibraryIcon,
				items: libraries?.map((library) => ({
					...library,
					active: libraryIsActive(library.id),
					href: `/library/${library.id}`,
					onHover: () => refreshUseLibrary(library.id),
				})),
				name: t('sidebar.buttons.libraries'),
			},
			{
				icon: List,
				name: 'Reading Lists',
			},
			// {
			// 	icon: LayoutGrid,
			// 	name: 'Collections',
			// },
			{
				href: '/settings',
				icon: Settings,
				name: t('sidebar.buttons.settings'),
			},
		]
	}, [libraries, location.pathname, t])

	return (
		<>
			{!isMobileSheet && <SidebarHeader />}

			<div className="flex max-h-full grow flex-col gap-2 overflow-hidden p-1">
				{links.map((link) =>
					link.items ? (
						<NavMenuItem key={link.name} {...link} onClick={(href) => navigate(href)} />
					) : (
						<NavItem key={link.name} {...link} active={linkIsActive(link.href)} />
					),
				)}
			</div>

			<Spacer />

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
			<div className="relative z-10 flex h-full w-56 shrink-0 flex-col gap-4 border-r border-gray-75 px-2 py-4 dark:border-gray-900 dark:bg-gray-1000">
				<SidebarContent />
			</div>
		</aside>
	)
}
