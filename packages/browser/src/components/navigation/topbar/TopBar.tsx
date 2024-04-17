import { useNavigationArrangement } from '@stump/client'
import { NavigationMenu } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { NavigationItem } from '@stump/types'
import { Book, Home } from 'lucide-react'
import React, { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router'
import { match } from 'ts-pattern'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'
import paths from '@/paths'

import { LibraryNavigationItem, SettingsNavigationItem } from './sections'
import { BookClubNavigationItem } from './sections/book-club'
import UserMenu from './sections/UserMenu'
import TopBarNavLink from './TopBarNavLink'

export default function TopNavigation() {
	const location = useLocation()

	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()
	const {
		preferences: { layout_max_width_px, navigation_arrangement },
	} = usePreferences()
	const { arrangement } = useNavigationArrangement({
		defaultArrangement: navigation_arrangement,
		suspense: false,
	})

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

	// TODO: Might need to pass a position prop to some of the menus in order to adjust
	// their sizing accordingly

	const sections = useMemo(
		() =>
			arrangement.items
				.filter(({ item: { type }, visible }) => checkSectionPermission(type) && visible)
				.map(({ item }) =>
					match(item)
						.with({ type: 'Home' }, () => (
							<TopBarNavLink
								key="home-topbar-navlink"
								to={paths.home()}
								isActive={location.pathname === paths.home()}
							>
								<Home className="mr-2 h-4 w-4" />
								{t('sidebar.buttons.home')}
							</TopBarNavLink>
						))
						.with({ type: 'Explore' }, () => (
							<TopBarNavLink
								key="explore-topbar-navlink"
								to={paths.bookSearch()}
								isActive={location.pathname === paths.bookSearch()}
							>
								<Book className="mr-2 h-4 w-4" />
								{t('sidebar.buttons.books')}
							</TopBarNavLink>
						))
						.with({ type: 'Libraries' }, (ctx) => (
							<LibraryNavigationItem
								key="libraries-topbar-navlink"
								showCreate={ctx.show_create_action}
								showLinkToAll={ctx.show_link_to_all}
							/>
						))
						// .with('SmartLists', () => <SmartListSideBarSection />)
						.with({ type: 'BookClubs' }, (ctx) => (
							<BookClubNavigationItem
								key="book-clubs-topbar-navlink"
								showCreate={ctx.show_create_action}
								showLinkToAll={ctx.show_link_to_all}
							/>
						))
						.otherwise(() => null),
				)
				.filter(Boolean),
		[arrangement, checkSectionPermission, location, t],
	)

	return (
		<div className="h-12 w-full border-b border-edge bg-sidebar">
			<div
				className="mx-auto flex h-12 items-center justify-between"
				style={{
					maxWidth: layout_max_width_px ? `${layout_max_width_px}px` : undefined,
				}}
			>
				<NavigationMenu className="z-[100] h-full">
					<NavigationMenu.List className="w-full pl-4">{sections}</NavigationMenu.List>
				</NavigationMenu>

				<div className="flex h-full items-center gap-x-2">
					<NavigationMenu className="z-[100] h-full pr-4" viewPortProps={{ align: 'right' }}>
						<NavigationMenu.List className="w-full">
							<SettingsNavigationItem />
							<UserMenu />
						</NavigationMenu.List>
					</NavigationMenu>
				</div>
			</div>
		</div>
	)
}
