import { UserPermission } from '@stump/types'
import { useMemo } from 'react'

import { useAppContext } from '@/context'

import { routeGroups } from './routes'

export function useSettingsRoutes() {
	const { checkPermission } = useAppContext()

	const adjustedGroups = useMemo(
		() =>
			routeGroups
				.map((group) => {
					const filteredItems = group.items.filter(
						({ permission }) => !permission || checkPermission(permission as UserPermission),
					)

					if (filteredItems.length === 0) {
						return null
					}

					return {
						...group,
						items: filteredItems,
					}
				})
				.filter(Boolean) as typeof routeGroups,
		[checkPermission],
	)

	return { groups: adjustedGroups }
}
