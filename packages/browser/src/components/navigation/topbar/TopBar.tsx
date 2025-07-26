import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { NavigationMenu } from '@stump/components'
import {
	FilterableArrangementEntityLink,
	graphql,
	SystemArrangement,
	UserPermission,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Book, Home } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router'
import { useDimensionsRef } from 'rooks'
import { match } from 'ts-pattern'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'
import paths from '@/paths'

import { LibraryNavigationItem, SettingsNavigationItem } from './sections'
import UserMenu from './sections/UserMenu'
import TopBarNavLink from './TopBarNavLink'

const query = graphql(`
	query TopNavigation {
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

export default function TopNavigation() {
	const location = useLocation()

	const [ref, size] = useDimensionsRef()
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const {
		data: {
			me: {
				preferences: { navigationArrangement },
			},
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('sidebar')) // TODO(graphql): See if I need a diff cache

	const { checkPermission } = useAppContext()
	const {
		preferences: { layoutMaxWidthPx },
	} = usePreferences()

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

	// TODO: Might need to pass a position prop to some of the menus in order to adjust
	// their sizing accordingly

	// TODO(graphql): Re-introduce support for other sections:
	// - Smart Lists
	// - Book Clubs
	// TODO(graphql): Re-introduce the prefetching
	const renderSystemSection = useCallback(
		(config: { variant: SystemArrangement; links: Array<FilterableArrangementEntityLink> }) =>
			match(config.variant)
				.with(SystemArrangement.Home, () => (
					<TopBarNavLink
						key="home-topbar-navlink"
						to={paths.home()}
						isActive={location.pathname === '/'}
						// onMouseEnter={() => prefetchHome()}
					>
						<Home className="mr-2 h-4 w-4 shrink-0" />
						{t('sidebar.buttons.home')}
					</TopBarNavLink>
				))
				.with(SystemArrangement.Explore, () => (
					<TopBarNavLink
						key="explore-topbar-navlink"
						to={paths.bookSearch()}
						isActive={location.pathname === paths.bookSearch()}
					>
						<Book className="mr-2 h-4 w-4 shrink-0" />
						{t('sidebar.buttons.books')}
					</TopBarNavLink>
				))
				.with(SystemArrangement.Libraries, () => (
					<LibraryNavigationItem
						key="libraries-topbar-navlink"
						links={config.links}
						width={size?.width}
					/>
				))
				.otherwise(() => null),
		[t, location.pathname, size],
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

	return (
		<div className="h-12 w-full border-b border-edge bg-sidebar">
			<div
				className="mx-auto flex h-12 items-center justify-between"
				style={{
					maxWidth: layoutMaxWidthPx ? `${layoutMaxWidthPx}px` : undefined,
				}}
			>
				<NavigationMenu className="z-[100] h-full">
					<div ref={ref}>
						<NavigationMenu.List className="w-full pl-4">{sections}</NavigationMenu.List>
					</div>
				</NavigationMenu>

				<div className="flex h-full shrink-0 items-center gap-x-2">
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
