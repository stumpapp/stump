import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { formatRouteKey, RouteGroup, useRouteGroups } from '@/hooks/useRouteGroups'
import { useTranslate } from '@/hooks/useTranslate'

import { PageSwitcherGroup } from './BreadcrumbPageSwitcher'

type Params = {
	/** in format of `<localeBase>.sidebar.<group>.<item>` */
	localeBase: string
	routeGroups: RouteGroup[]
	isActive?: (to: string, pathname: string) => boolean
	formatKey?: (key: string) => string
	/* will filter out items matching */
	filter?: (to: string) => boolean
}

const defaultIsActive = (to: string, pathname: string) => pathname.includes(to)

export function usePageSwitcherGroups({
	localeBase,
	routeGroups,
	isActive = defaultIsActive,
	formatKey = formatRouteKey,
	filter,
}: Params): PageSwitcherGroup[] {
	const location = useLocation()
	const { t } = useTranslate()
	const { groups } = useRouteGroups({ routeGroups })

	return useMemo(
		() =>
			groups.map(({ label, items }) => ({
				label: label ? t(`${localeBase}.sidebar.${formatKey(label)}.label`) : undefined,
				items: items
					.filter(({ to }) => !filter || filter(to))
					.map(({ to, icon, label: itemLabel, disabled }) => ({
						to,
						icon,
						disabled,
						isActive: isActive(to, location.pathname),
						label: t(
							label
								? `${localeBase}.sidebar.${formatKey(label)}.${formatKey(itemLabel)}`
								: `${localeBase}.sidebar.${formatKey(itemLabel)}`,
						),
					})),
			})),
		[groups, t, localeBase, formatKey, filter, isActive, location.pathname],
	)
}
