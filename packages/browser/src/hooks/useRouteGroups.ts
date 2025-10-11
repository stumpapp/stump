import { UserPermission } from '@stump/graphql'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'

import { useAppContext } from '@/context'

type SubItem = {
	localeKey: string
	matcher: (path: string) => boolean
	backlink?: {
		localeKey: string
		to: string
	}
}

type Route = {
	icon: LucideIcon
	label: string
	localeKey: string
	permission?: UserPermission
	customPermission?: () => boolean
	to: string
	subItems?: SubItem[]
	disabled?: boolean
}

export type RouteGroup = {
	defaultRoute: string
	items: Route[]
	label?: string
}

type UseRouteGroupsParams = {
	routeGroups: RouteGroup[]
}

/**
 * A hook that returns a filtered list of provided route groups based on what the
 * current user has access to. If a group has no items left after filtering, it will
 * be removed from the list.
 */
export function useRouteGroups({ routeGroups }: UseRouteGroupsParams) {
	const { checkPermission } = useAppContext()

	const adjustedGroups = useMemo(
		() =>
			routeGroups
				.map((group) => {
					// Filter out items that the user doesn't have access to. If an item has no
					// permissions requirement, then it will be included.
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
		[checkPermission, routeGroups],
	)

	return { groups: adjustedGroups }
}

/**
 * A utility function that formats a label into a route key used for matching routes to
 * their locale keys. This function will lowercase the label and replace spaces with hyphens.
 */
export const formatRouteKey = (key: string) => key.toLowerCase().replace(/ /g, '-')
