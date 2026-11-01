import { Breadcrumb } from '@stump/components'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { BreadcrumbPageSwitcher } from '@/components/navigation/BreadcrumbPageSwitcher'
import { usePageSwitcherGroups } from '@/components/navigation/usePageSwitcherGroups'
import { PageHeader } from '@/components/sharedLayout'
import { RouteGroup } from '@/hooks/useRouteGroups'
import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	localeBase: string
	routeGroups: RouteGroup[]
	/** used for the first breadcrumb segment */
	entityName?: string
}

const isActiveRoute = (to: string, pathname: string) => pathname.endsWith(to)

export default function GenericSettingsHeader({ localeBase, routeGroups, entityName }: Props) {
	const location = useLocation()
	const { t } = useTranslate()

	const switcherGroups = usePageSwitcherGroups({
		localeBase,
		routeGroups,
		isActive: isActiveRoute,
	})

	/**
	 * The active route based on the current location
	 */
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

	const translatedHeader = t(`${localeBase}.${activeRouteKey}.title`)

	return (
		<PageHeader>
			<Breadcrumb>
				<Breadcrumb.List>
					{entityName && (
						<>
							<Breadcrumb.Item>{entityName}</Breadcrumb.Item>
							<Breadcrumb.Separator />
						</>
					)}
					<Breadcrumb.Item>
						<BreadcrumbPageSwitcher title={translatedHeader} groups={switcherGroups} />
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb>
		</PageHeader>
	)
}
