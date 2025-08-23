import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn, Spacer } from '@stump/components'
import {
	FilterableArrangementEntityLink,
	graphql,
	SystemArrangement,
	UserPermission,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { motion } from 'framer-motion'
import { Book, Home } from 'lucide-react'
import { Suspense, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'
import { match } from 'ts-pattern'

import { useAppContext, useRouterContext } from '@/context'
import { useTheme } from '@/hooks'
import { usePathActive, usePaths } from '@/paths'
import { usePrefetchHomeScene } from '@/scenes/home'
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
							... on SystemArrangementConfig {
								variant
								links
							}
						}
						visible
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

	const paths = usePaths()

	const { basePath } = useRouterContext()
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const {
		data: {
			me: {
				preferences: { navigationArrangement },
			},
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('sidebar'))

	const { checkPermission } = useAppContext()
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
		(variant: SystemArrangement) => {
			if (variant === SystemArrangement.BookClubs) {
				return checkPermission(UserPermission.AccessBookClub)
			} else if (variant === SystemArrangement.SmartLists) {
				return checkPermission(UserPermission.AccessSmartList)
			} else {
				return true
			}
		},
		[checkPermission],
	)

	const prefetchHome = usePrefetchHomeScene()

	const renderSystemSection = useCallback(
		(config: { variant: SystemArrangement; links: Array<FilterableArrangementEntityLink> }) =>
			match(config.variant)
				.with(SystemArrangement.Home, () => (
					<SideBarButtonLink
						key="home-sidebar-navlink"
						to={paths.home()}
						isActive={location.pathname === basePath + '/'}
						onMouseEnter={() => prefetchHome()}
					>
						<Home className="mr-2 h-4 w-4 shrink-0" />
						{t('sidebar.buttons.home')}
					</SideBarButtonLink>
				))
				.with(SystemArrangement.Explore, () => (
					<SideBarButtonLink
						key="explore-sidebar-navlink"
						to={paths.bookSearch()}
						isActive={location.pathname === paths.bookSearch()}
					>
						<Book className="mr-2 h-4 w-4 shrink-0" />
						{t('sidebar.buttons.books')}
					</SideBarButtonLink>
				))
				.with(SystemArrangement.Libraries, () => (
					<Suspense key="libraries-sidebar-navlink">
						<LibrarySideBarSection isMobile={isMobile} links={config.links} />
					</Suspense>
				))
				.with(SystemArrangement.SmartLists, () => (
					<Suspense key="smartlists-sidebar-navlink">
						<SmartListSideBarSection links={config.links} />
					</Suspense>
				))
				.with(SystemArrangement.BookClubs, () => (
					<Suspense key="book-clubs-sidebar-navlink">
						<BookClubSideBarSection isMobile={isMobile} links={config.links} />
					</Suspense>
				))
				.otherwise(() => null),
		[t, location.pathname, prefetchHome, isMobile, paths],
	)

	const sections = useMemo(
		() =>
			navigationArrangement.sections
				.filter(({ visible }) => visible)
				.map(({ config }) =>
					match(config)
						.with({ __typename: 'SystemArrangementConfig' }, (config) => {
							const child = renderSystemSection(config)
							if (!checkSectionPermission(config.variant)) {
								return null
							}
							return child
						})
						.otherwise(() => null),
				)
				.filter(Boolean),
		[navigationArrangement, renderSystemSection, checkSectionPermission],
	)

	const renderContent = () => {
		return (
			<>
				{renderHeader()}

				<div className="flex max-h-full grow flex-col gap-2 overflow-y-auto p-1 scrollbar-hide">
					{isAtLeastMedium && isBrowser && <UserMenu />}

					{sections}
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
