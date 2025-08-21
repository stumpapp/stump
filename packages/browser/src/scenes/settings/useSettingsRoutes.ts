import { useSDK } from '@stump/client'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useAppContext } from '@/context'

import { createRouteGroups } from './routes'

/**
 * A hook that returns a filtered list of the settings route groups based on what the
 * current user has access to. If a group has no items left after filtering, it will
 * be removed from the list.
 */
export function useSettingsRoutes() {
	const { sdk } = useSDK()
	const { checkPermission } = useAppContext()

	const client = useQueryClient()

	const routeGroups = useMemo(() => createRouteGroups(client, sdk), [client, sdk])

	const adjustedGroups = useMemo(
		() =>
			routeGroups
				.map((group) => {
					// Filter out items that the user doesn't have access to. If an item has no
					// permissions requirement, then it will be included.
					const filteredItems = group.items.filter(
						({ permission }) => !permission || checkPermission(permission),
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
		[checkPermission, routeGroups],
	)

	return { groups: adjustedGroups }
}
