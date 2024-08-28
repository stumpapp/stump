import { NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { formatRouteKey, useRouteGroups } from '@/hooks/useRouteGroups'

import { routeGroups } from './routes'

export default function LibrarySettingsSelectNavigation() {
	const navigate = useNavigate()
	const location = useLocation()

	const { t } = useLocaleContext()
	const { groups } = useRouteGroups({ routeGroups })

	const activeRouteGroup = useMemo(
		() => groups.find((group) => group.items.some((page) => location.pathname.startsWith(page.to))),
		[location.pathname, groups],
	)

	const activeSubRoute = useMemo(
		() => activeRouteGroup?.items.find((page) => location.pathname.startsWith(page.to))?.to,
		[activeRouteGroup, location.pathname],
	)

	const selectOptions = useMemo(() => {
		const allOptions = groups.flatMap(
			(group) =>
				group.items.map((item) => ({
					disabled: item.disabled,
					label: t(
						group.label
							? `librarySettingsScene.sidebar.${formatRouteKey(group.label)}.${formatRouteKey(item.label)}`
							: `librarySettingsScene.sidebar.${formatRouteKey(item.label)}`,
					),
					value: item.to,
				})) ?? [],
		)

		return allOptions
	}, [t, groups])

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
