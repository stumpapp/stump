import { Breadcrumb } from '@stump/components'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { BreadcrumbPageSwitcher } from '@/components/navigation/BreadcrumbPageSwitcher'
import { usePageSwitcherGroups } from '@/components/navigation/usePageSwitcherGroups'
import { PageHeader } from '@/components/sharedLayout'
import { useRouterContext } from '@/context/RouterContext'
import { useTranslate } from '@/hooks/useTranslate'

import { useLibraryContext } from '../../../../components/library/context'
import { LibraryPatternDisplay } from './options/scanner'
import { createRouteGroups } from './routes'

const isActiveRoute = (to: string, pathname: string) => pathname.endsWith(to)

export default function LibrarySettingsHeader() {
	const location = useLocation()
	const { library } = useLibraryContext()
	const { t } = useTranslate()
	const { basePath } = useRouterContext()

	/**
	 * The active route based on the current location
	 */
	const routeGroups = useMemo(() => createRouteGroups(library.id, basePath), [library.id, basePath])
	const activeRouteGroup = useMemo(
		() =>
			routeGroups
				.flatMap((group) => group.items)
				.find((page) => location.pathname.endsWith(page.to)),
		[location.pathname, routeGroups],
	)

	/**
	 * The active route's locale key, which is used to pull the title and description. If
	 * the active route has sub-items, we'll have to check the provided matchers to see
	 * if/which sub-item is active
	 */
	const activeRouteKey = useMemo(() => {
		if (!activeRouteGroup) {
			return null
		}

		const matchedSubItemKey = activeRouteGroup.subItems?.find((subItem) =>
			subItem.matcher(location.pathname),
		)?.localeKey

		return matchedSubItemKey || activeRouteGroup?.localeKey
	}, [activeRouteGroup, location.pathname])

	const translatedHeader = t(`librarySettingsScene.${activeRouteKey}.title`)

	const isScannerSettings = activeRouteKey === 'options/scanning'

	const switcherGroups = usePageSwitcherGroups({
		localeBase: 'librarySettingsScene',
		routeGroups,
		isActive: isActiveRoute,
	})

	return (
		<>
			<PageHeader>
				<Breadcrumb>
					<Breadcrumb.List>
						<Breadcrumb.Item>{library.name}</Breadcrumb.Item>
						{/*<Breadcrumb.Separator />
  						<Breadcrumb.Item>Settings</Breadcrumb.Item>*/}
						<Breadcrumb.Separator />
						<Breadcrumb.Item>
							<BreadcrumbPageSwitcher title={translatedHeader} groups={switcherGroups} />
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb>

				{isScannerSettings && <LibraryPatternDisplay />}
			</PageHeader>
		</>
	)
}
