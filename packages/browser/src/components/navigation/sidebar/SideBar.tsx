import { useSuspenseGraphQL } from '@stump/client'
import { cn, Spacer } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { NavigationItem } from '@stump/sdk'
import { motion } from 'framer-motion'
import { Book, Home } from 'lucide-react'
import { useCallback } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { useAppContext } from '@/context'
import { usePreferences, useTheme } from '@/hooks'
import paths from '@/paths'
import { useAppStore } from '@/stores'

import UserMenu from '../../UserMenu'
import NavigationButtons from '../mobile/NavigationButtons'
import { BookClubSideBarSection, LibrarySideBarSection, SmartListSideBarSection } from './sections'
import SideBarButtonLink from './SideBarButtonLink'
import SideBarFooter from './SideBarFooter'

const query = graphql(`
	query SideBarQuery {
		me {
			id
			preferences {
				navigationArrangement {
					locked
					sections {
						config {
							__typename
						}
					}
				}
			}
		}
	}
`)

type Props = {
	asChild?: boolean
	hidden?: boolean
}

export default function SideBar({ asChild, hidden }: Props) {
	const location = useLocation()
	const platform = useAppStore((store) => store.platform)

	const { t } = useLocaleContext()

	const { data } = useSuspenseGraphQL(query, ['sidebarQuery'])

	const { checkPermission } = useAppContext()
	// const {
	// 	preferences: { navigation_arrangement },
	// } = usePreferences()
	// const { arrangement } = useNavigationArrangement({
	// 	defaultArrangement: navigation_arrangement,
	// 	suspense: false,
	// })
	const { shouldUseGradient } = useTheme()

	const isBrowser = platform === 'browser'
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')
	const isMobile = useMediaMatch('(max-width: 768px)')

	const renderHeader = () => {
		if (!isBrowser && isAtLeastMedium) {
			return (
				<header className="flex w-full justify-between gap-1">
					<UserMenu />
					<NavigationButtons />
				</header>
			)
		}

		return null
	}

	const checkSectionPermission = useCallback(
		(section: NavigationItem['type']) => {
			if (section === 'BookClubs') {
				return checkPermission('bookclub:read')
			} else if (section === 'SmartLists') {
				return checkPermission('smartlist:read')
			} else {
				return true
			}
		},
		[checkPermission],
	)

	// const sections = useMemo(
	// 	() =>
	// 		arrangement.items
	// 			.filter(({ item: { type }, visible }) => checkSectionPermission(type) && visible)
	// 			.map(({ item }) =>
	// 				match(item)
	// 					.with({ type: 'Home' }, () => (
	// 						<SideBarButtonLink
	// 							key="home-sidebar-navlink"
	// 							to={paths.home()}
	// 							isActive={location.pathname === '/'}
	// 						>
	// 							<Home className="mr-2 h-4 w-4 shrink-0" />
	// 							{t('sidebar.buttons.home')}
	// 						</SideBarButtonLink>
	// 					))
	// 					.with({ type: 'Explore' }, () => (
	// 						<SideBarButtonLink
	// 							key="explore-sidebar-navlink"
	// 							to={paths.bookSearch()}
	// 							isActive={location.pathname === paths.bookSearch()}
	// 						>
	// 							<Book className="mr-2 h-4 w-4 shrink-0" />
	// 							{t('sidebar.buttons.books')}
	// 						</SideBarButtonLink>
	// 					))
	// 					.with({ type: 'Libraries' }, (ctx) => (
	// 						<LibrarySideBarSection
	// 							key="libraries-sidebar-navlink"
	// 							isMobile={isMobile}
	// 							showCreate={ctx.show_create_action}
	// 							showLinkToAll={ctx.show_link_to_all}
	// 						/>
	// 					))
	// 					.with({ type: 'SmartLists' }, (ctx) => (
	// 						<SmartListSideBarSection
	// 							key="smartlists-sidebar-navlink"
	// 							showCreate={ctx.show_create_action}
	// 							showLinkToAll={ctx.show_link_to_all}
	// 						/>
	// 					))
	// 					.with({ type: 'BookClubs' }, (ctx) => (
	// 						<BookClubSideBarSection
	// 							key="book-clubs-sidebar-navlink"
	// 							isMobile={isMobile}
	// 							showCreate={ctx.show_create_action}
	// 							showLinkToAll={ctx.show_link_to_all}
	// 						/>
	// 					))
	// 					.otherwise(() => null),
	// 			)
	// 			.filter(Boolean),
	// 	[arrangement, checkSectionPermission, location, t, isMobile],
	// )

	const renderContent = () => {
		return (
			<>
				{renderHeader()}

				<div className="flex max-h-full grow flex-col gap-2 overflow-y-auto p-1 scrollbar-hide">
					{isAtLeastMedium && isBrowser && <UserMenu />}
					{/* {sections} */}

					<SideBarButtonLink
						key="home-sidebar-navlink"
						to={paths.home()}
						isActive={location.pathname === '/'}
					>
						<Home className="mr-2 h-4 w-4 shrink-0" />
						{t('sidebar.buttons.home')}
					</SideBarButtonLink>
				</div>
				<Spacer />

				{isAtLeastMedium && <SideBarFooter />}
			</>
		)
	}

	if (asChild) {
		return <div className="min-h-full">{renderContent()}</div>
	}

	const variants = {
		hidden: { width: 0, x: -SIDEBAR_WIDTH },
		visible: { width: SIDEBAR_WIDTH, x: 0 },
	}

	return (
		<motion.aside
			key="primary-sidebar"
			className="hidden min-h-full md:inline-block"
			animate={hidden ? 'hidden' : 'visible'}
			variants={variants}
			initial={false}
			transition={{ duration: 0.2, ease: 'easeInOut' }}
		>
			<div
				className={cn(
					'relative z-10 flex h-full w-56 shrink-0 flex-col gap-4 border-r border-edge bg-sidebar px-2 py-4',
					{
						'bg-gradient-to-tr from-sidebar-gradient-from to-sidebar-gradient-to':
							shouldUseGradient,
					},
				)}
			>
				{renderContent()}
			</div>
		</motion.aside>
	)
}

export const SIDEBAR_WIDTH = 224
