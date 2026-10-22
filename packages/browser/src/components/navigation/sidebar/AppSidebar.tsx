import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn } from '@stump/components'
import {
	FilterableArrangementEntityLink,
	graphql,
	SystemArrangement,
	UserPermission,
} from '@stump/graphql'
import { Book, Home } from 'lucide-react'
import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'
import { match } from 'ts-pattern'

import { useAppContext, useRouterContext } from '@/context'
import { useTheme } from '@/hooks'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'
import { usePrefetchHomeScene } from '@/scenes/home/HomeScene'
import { useLocalPreferencesStore } from '@/stores/user'

import UserMenu from '../../UserMenu'
import { Sidebar, useSidebar } from './base'
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

export default function AppSidebar() {
	const location = useLocation()
	const paths = usePaths()

	const { basePath } = useRouterContext()
	const { t, translate } = useTranslate()
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
	const { isMobile, setOpenMobile } = useSidebar()

	const sidebarConfig = useLocalPreferencesStore((store) => store.sidebar)

	// anytime we navigate on mobile we close the sidebar (which is more like a
	// burger+sheet for mobile)
	useEffect(() => {
		setOpenMobile(false)
	}, [location.pathname, setOpenMobile])

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
						{translate('shared.common.home')}
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
		[t, location.pathname, prefetchHome, isMobile, paths, basePath, translate],
	)

	const sections = useMemo(
		() =>
			navigationArrangement.sections
				.filter(({ visible }) => visible)
				.map(({ config }) =>
					match(config)
						.with({ __typename: 'SystemArrangementConfig' }, (config) =>
							checkSectionPermission(config.variant) ? renderSystemSection(config) : null,
						)
						.otherwise(() => null),
				)
				.filter(Boolean),
		[navigationArrangement, renderSystemSection, checkSectionPermission],
	)

	// TODO: ive wired up collapsible options, but icon is ugly af. just needs to render icon
	// versions of each enabled section instead of what exists
	return (
		<Sidebar
			variant={sidebarConfig.variant}
			collapsible={sidebarConfig.collapsible}
			className={cn('gap-2 pt-2', {
				'bg-linear-to-tr from-sidebar-gradient-from to-sidebar-gradient-to': shouldUseGradient,
			})}
		>
			<Sidebar.Content className="gap-1 px-2">
				<div>
					<UserMenu />
					<div className="h-1" />
				</div>
				{sections}
				<SideBarFooter />
			</Sidebar.Content>

			{sidebarConfig.variant === 'sidebar' && <Sidebar.Rail />}
		</Sidebar>
	)
}
