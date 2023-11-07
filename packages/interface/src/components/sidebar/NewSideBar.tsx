import { useAppProps } from '@stump/client'
import { Spacer } from '@stump/components'
import { Book, Home } from 'lucide-react'
import React from 'react'

import { useLocaleContext } from '../../i18n'
import paths from '../../paths'
import ApplicationVersion from '../ApplicationVersion'
import NavigationButtons from '../topbar/NavigationButtons'
import { BookClubSideBarSection, LibrarySideBarSection } from './sections'
import SettingsButton from './Settings'
import SideBarButtonLink from './SideBarButtonLink'
import UserMenu from './UserMenu'

type Props = {
	asChild?: boolean
}

export default function SideBar({ asChild }: Props) {
	const { platform } = useAppProps()
	const { t } = useLocaleContext()

	const isBrowser = platform === 'browser'

	const renderHeader = () => {
		if (isBrowser) return null

		return (
			<header className="flex w-full flex-row-reverse">
				<NavigationButtons />
			</header>
		)
	}

	const renderFooter = () => {
		return (
			<footer className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<SettingsButton />
					{/* <div className="flex items-center gap-2">
						<Logout />
						<ThemeToggle />
					</div> */}
				</div>
				<ApplicationVersion />
			</footer>
		)
	}

	const renderContent = () => {
		return (
			<>
				{renderHeader()}

				<div className="flex max-h-full grow flex-col gap-4 overflow-y-scroll p-1 scrollbar-hide">
					<UserMenu />

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

					<LibrarySideBarSection />
					<BookClubSideBarSection />
				</div>
				<Spacer />

				{renderFooter()}
			</>
		)
	}

	if (asChild) {
		return renderContent()
	}

	return (
		<aside className="hidden min-h-full md:inline-block">
			<div className="relative z-10 flex h-full w-48 shrink-0 flex-col gap-4 border-r border-gray-75 px-2 py-4 dark:border-gray-900 dark:bg-gray-1000">
				{renderContent()}
			</div>
		</aside>
	)
}
