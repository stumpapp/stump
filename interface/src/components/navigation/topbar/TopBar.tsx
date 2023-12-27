import { NavigationMenu } from '@stump/components'
import { Book, Home } from 'lucide-react'
import React from 'react'

import UserMenu from '@/components/UserMenu'
import { useAppContext } from '@/context'
import { useLocaleContext } from '@/i18n'
import paths from '@/paths'

import { LibraryNavigationItem, SettingsNavigationItem } from './sections'
import { BookClubNavigationItem } from './sections/book-club'
import TopBarNavLink from './TopBarNavLink'

const IS_DEVELOPMENT = import.meta.env.MODE === 'development'

// TODO: animation when enabled would be nice

export default function TopNavigation() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const showBookClubs = IS_DEVELOPMENT && checkPermission('bookclub:read')

	return (
		<div className="h-12 w-full border-b border-edge bg-sidebar">
			<div className="mx-auto flex h-12 max-w-7xl items-center justify-between">
				<NavigationMenu className="z-[100] h-full">
					<NavigationMenu.List>
						<TopBarNavLink to={paths.home()}>
							<Home className="mr-2 h-4 w-4" />
							{t('sidebar.buttons.home')}
						</TopBarNavLink>

						<TopBarNavLink to={paths.bookSearch()}>
							<Book className="mr-2 h-4 w-4" />
							Explore
						</TopBarNavLink>

						<LibraryNavigationItem />
						{showBookClubs && <BookClubNavigationItem />}
						<SettingsNavigationItem />
					</NavigationMenu.List>
				</NavigationMenu>

				<div>
					<UserMenu variant="topbar" />
				</div>
			</div>
		</div>
	)
}
