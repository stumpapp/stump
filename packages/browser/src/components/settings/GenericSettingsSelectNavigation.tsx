import { NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ComponentProps, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { formatRouteKey, useRouteGroups } from '@/hooks/useRouteGroups'

import GenericSettingsHeader from './GenericSettingsHeader'

type Props = ComponentProps<typeof GenericSettingsHeader>

export default function GenericSettingsSelectNavigation({ localeBase, routeGroups }: Props) {
	const navigate = useNavigate()
	const location = useLocation()

	const { t } = useLocaleContext()
	const { groups } = useRouteGroups({ routeGroups })

	/**
	 * The active group based on the current location
	 */
	const activeRouteGroup = useMemo(
		() => groups.find((group) => group.items.some((page) => location.pathname.startsWith(page.to))),
		[location.pathname, groups],
	)

	/**
	 * The active sub-route based on the current location, if any
	 */
	const activeSubRoute = useMemo(
		() => activeRouteGroup?.items.find((page) => location.pathname.startsWith(page.to))?.to,
		[activeRouteGroup, location.pathname],
	)

	/**
	 * The options for the select dropdown, which is effectively just a flattened list of all
	 * available routes in all groups
	 */
	const selectOptions = useMemo(() => {
		const allOptions = groups.flatMap(
			(group) =>
				group.items.map((item) => ({
					disabled: item.disabled,
					label: t(
						group.label
							? `${localeBase}.sidebar.${formatRouteKey(group.label)}.${formatRouteKey(item.label)}`
							: `${localeBase}.sidebar.${formatRouteKey(item.label)}`,
					),
					value: item.to,
				})) ?? [],
		)

		return allOptions
	}, [t, groups, localeBase])

	if (!selectOptions.length) {
		return null
	}

	return (
		<NativeSelect
			options={selectOptions}
			value={activeSubRoute}
			onChange={(e) => {
				navigate(e.target.value)
			}}
			className="md:max-w-xs"
		/>
	)
}
