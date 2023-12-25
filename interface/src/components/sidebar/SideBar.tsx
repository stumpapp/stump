import { useAppProps } from '@stump/client'
import { Spacer } from '@stump/components'
import { motion } from 'framer-motion'
import { Book, Home } from 'lucide-react'
import React from 'react'
import { useMediaMatch } from 'rooks'

import { useAppContext } from '../../context'
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
	hidden?: boolean
}

export default function SideBar({ asChild, hidden }: Props) {
	const { platform } = useAppProps()
	const { t } = useLocaleContext()

	const { checkPermission } = useAppContext()
	const showBookClubs = IS_DEVELOPMENT && checkPermission('bookclub:read')

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
		return <div className="min-h-full">{renderContent()}</div>
	}

	const variants = {
		hidden: { width: 0, x: '-13rem' },
		visible: { width: '13rem', x: 0 },
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
			<div className="relative z-10 flex h-full w-52 shrink-0 flex-col gap-4 border-r border-edge bg-sidebar px-2 py-4">
				{renderContent()}
			</div>
		</motion.aside>
	)
}
