import { useAppProps } from '@stump/client'
import { Spacer } from '@stump/components'
import { Home } from 'lucide-react'
import React from 'react'

import { useLocaleContext } from '../../i18n'
import paths from '../../paths'
import ApplicationVersion from '../ApplicationVersion'
import NavigationButtons from '../topbar/NavigationButtons'
import Logout from './Logout'
import { LibrarySideBarSection } from './sections'
import SideBarButtonLink from './SideBarButtonLink'
import ThemeToggle from './ThemeToggle'

export default function SideBar() {
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
			<footer className="flex items-center justify-between">
				<ApplicationVersion />
				<div className="flex items-center gap-2">
					<Logout />
					<ThemeToggle />
				</div>
			</footer>
		)
	}

	return (
		<aside className="hidden min-h-full md:inline-block">
			<div className="relative z-10 flex h-full w-48 shrink-0 flex-col gap-4 border-r border-gray-75 px-2 py-4 dark:border-gray-900 dark:bg-gray-1000">
				{renderHeader()}

				<div className="flex max-h-full grow flex-col gap-4 overflow-y-scroll p-1 scrollbar-hide">
					<SideBarButtonLink
						className="gap-x-2"
						href={paths.libraryCreate()}
						isActive={location.pathname === '/'}
					>
						<Home className="h-4 w-4" />
						{t('sidebar.buttons.home')}
					</SideBarButtonLink>

					<SideBarButtonLink
						className="gap-x-2"
						href={paths.libraryCreate()}
						isActive={location.pathname === '/'}
					>
						<Home className="h-4 w-4" />
						Explore
					</SideBarButtonLink>

					<LibrarySideBarSection />
				</div>
				<Spacer />

				{renderFooter()}
			</div>
		</aside>
	)
}
