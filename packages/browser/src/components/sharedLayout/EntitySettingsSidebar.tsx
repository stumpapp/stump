import { useLocation } from 'react-router'

import { formatRouteKey, RouteGroup } from '@/hooks/useRouteGroups'
import { useTranslate } from '@/hooks/useTranslate'

import { SecondarySidebar } from './SecondarySidebar'

type Props = {
	localeBase: string
	/** the route groups to render, should come filtered by permissions etc  */
	groups: RouteGroup[]
	backlink: {
		to: string
		label: string
	}
}

/**
 * the settings sidebar for an entity (library, book club, etc):
 * - labels are resolved from `${localeBase}.sidebar.${group}.${item}`, or `${localeBase}.sidebar.${item}`
 *   for ungrouped items
 */
export function EntitySettingsSidebar({ localeBase, groups, backlink }: Props) {
	const location = useLocation()
	const { t } = useTranslate()

	const base = `${localeBase}.sidebar`

	return (
		<SecondarySidebar>
			<SecondarySidebar.Back to={backlink.to} label={backlink.label} />

			{groups.map(({ label, items }) => {
				const groupKey = label ? formatRouteKey(label) : null
				const itemKey = (key: string) =>
					groupKey ? `${base}.${groupKey}.${formatRouteKey(key)}` : `${base}.${formatRouteKey(key)}`

				return (
					<SecondarySidebar.Group
						key={groupKey ?? 'ungrouped'}
						label={groupKey ? t(`${base}.${groupKey}.label`) : undefined}
					>
						{items.map(({ to, icon, label, disabled, prefetch }) => (
							<SecondarySidebar.Item
								key={to}
								to={to}
								icon={icon}
								isActive={location.pathname.includes(to)}
								isDisabled={disabled}
								prefetch={prefetch}
							>
								{t(itemKey(label))}
							</SecondarySidebar.Item>
						))}
					</SecondarySidebar.Group>
				)
			})}
		</SecondarySidebar>
	)
}
