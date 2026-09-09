import { AccessRole } from '@stump/graphql'
import { Bolt, NotebookTabs, PackageX, Shield } from 'lucide-react'

import { RouteGroup } from '@/hooks/useRouteGroups'

export const createRouteGroups = (id: string, role: AccessRole): RouteGroup[] => [
	{
		defaultRoute: `/smart-lists/${id}/settings/basics`,
		items: [
			{
				customPermission: () => role === AccessRole.CoCreator,
				icon: NotebookTabs,
				label: 'Basics',
				localeKey: 'basics',
				to: `/smart-lists/${id}/settings/basics`,
			},
		],
	},
	{
		defaultRoute: `/smart-lists/${id}/settings/access`,
		items: [
			{
				customPermission: () => role === AccessRole.CoCreator,
				icon: Shield,
				label: 'Access',
				localeKey: 'access',
				to: `/smart-lists/${id}/settings/access`,
			},
			{
				customPermission: () => role === AccessRole.CoCreator,
				icon: Bolt,
				label: 'Filters',
				localeKey: 'filters',
				to: `/smart-lists/${id}/settings/filters`,
			},
		],
		label: 'Configuration',
	},
	{
		defaultRoute: `/smart-lists/${id}/settings/delete`,
		items: [
			{
				icon: PackageX,
				label: 'Delete',
				localeKey: 'danger-zone/delete',
				// permission: 'bookclub:manage',
				to: `/smart-lists/${id}/settings/delete`,
			},
		],
		label: 'Danger Zone',
	},
]
