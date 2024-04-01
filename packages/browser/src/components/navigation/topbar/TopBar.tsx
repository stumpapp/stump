import { NavigationMenu } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Book, Home } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'
import paths from '@/paths'

import { LibraryNavigationItem, SettingsNavigationItem } from './sections'
import { BookClubNavigationItem } from './sections/book-club'
import UserMenu from './sections/UserMenu'
import TopBarNavLink from './TopBarNavLink'

const IS_DEVELOPMENT = import.meta.env.MODE === 'development'

// TODO: animation when enabled would be nice

export default function TopNavigation() {
	const location = useLocation()

	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()
	const {
		preferences: { layout_max_width_px },
	} = usePreferences()

	const showBookClubs = IS_DEVELOPMENT && checkPermission('bookclub:read')

	return (
		<div className="h-12 w-full border-b border-edge bg-sidebar">
			<div
				className="mx-auto flex h-12 items-center justify-between"
				style={{
					maxWidth: layout_max_width_px ? `${layout_max_width_px}px` : undefined,
				}}
			>
				<NavigationMenu className="z-[100] h-full">
					<NavigationMenu.List className="w-full pl-4">
						<TopBarNavLink to={paths.home()} isActive={location.pathname === paths.home()}>
							<Home className="mr-2 h-4 w-4" />
							{t('sidebar.buttons.home')}
						</TopBarNavLink>

						<TopBarNavLink
							to={paths.bookSearch()}
							isActive={location.pathname === paths.bookSearch()}
						>
							<Book className="mr-2 h-4 w-4" />
							Explore
						</TopBarNavLink>

						<LibraryNavigationItem />
						{showBookClubs && <BookClubNavigationItem />}
					</NavigationMenu.List>
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
