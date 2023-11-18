import { useAppProps, useUserStore } from '@stump/client'
import { Spacer } from '@stump/components'
import { Book, Home } from 'lucide-react'
import React from 'react'
import { useMediaMatch } from 'rooks'

import { useLocaleContext } from '../../i18n'
import paths from '../../paths'
import NavigationButtons from '../topbar/NavigationButtons'
import UserMenu from '../UserMenu'
import { BookClubSideBarSection, LibrarySideBarSection } from './sections'
import SideBarButtonLink from './SideBarButtonLink'
import SideBarFooter from './SideBarFooter'

const IS_DEVELOPMENT = import.meta.env.MODE === 'development'

type Props = {
	asChild?: boolean
}

export default function SideBar({ asChild }: Props) {
	const { platform } = useAppProps()
	const { t } = useLocaleContext()

	const checkUserPermission = useUserStore((store) => store.checkUserPermission)
	const showBookClubs = IS_DEVELOPMENT && checkUserPermission('bookclub:read')

	const isBrowser = platform === 'browser'
	const isMobile = useMediaMatch('(max-width: 768px)')

	const renderHeader = () => {
		if (!isBrowser && !isMobile) {
			return (
				<header className="flex w-full justify-between gap-1">
					<UserMenu />
					<NavigationButtons />
				</header>
			)
		}

		return null
	}

	const renderContent = () => {
		return (
			<>
				{renderHeader()}

				<div className="flex max-h-full grow flex-col gap-4 overflow-y-scroll p-1 scrollbar-hide">
					{!isMobile && <UserMenu />}

					<div className="flex flex-col gap-2">
						<SideBarButtonLink to={paths.home()} isActive={location.pathname === '/'}>
							<Home className="mr-2 h-4 w-4" />
							{t('sidebar.buttons.home')}
						</SideBarButtonLink>

						<SideBarButtonLink
							to={paths.bookSearch()}
							isActive={location.pathname === paths.bookSearch()}
						>
							<Book className="mr-2 h-4 w-4" />
							Explore
						</SideBarButtonLink>
					</div>

					<LibrarySideBarSection isMobile={isMobile} />
					{showBookClubs && <BookClubSideBarSection isMobile={isMobile} />}
				</div>
				<Spacer />

				{!isMobile && <SideBarFooter />}
			</>
		)
	}

	if (asChild) {
		return renderContent()
	}

	return (
		<aside className="hidden min-h-full md:inline-block">
			<div className="relative z-10 flex h-full w-52 shrink-0 flex-col gap-4 border-r border-gray-75 px-2 py-4 dark:border-gray-900 dark:bg-gray-1000">
				{renderContent()}
			</div>
		</aside>
	)
}
