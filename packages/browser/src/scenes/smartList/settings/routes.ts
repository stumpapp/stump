import { AccessRole } from '@stump/graphql'
import { Bolt, NotebookTabs, PackageX, Shield } from 'lucide-react'

import { RouteGroup } from '@/hooks/useRouteGroups'

export const createRouteGroups = (role: AccessRole): RouteGroup[] => [
	{
		defaultRoute: 'settings/basics',
		items: [
			{
				customPermission: () => role === AccessRole.CoCreator,
				icon: NotebookTabs,
				label: 'Basics',
				localeKey: 'basics',
				to: 'settings/basics',
			},
		],
	},
	{
		defaultRoute: 'members',
		items: [
			{
				customPermission: () => role === AccessRole.CoCreator,
				icon: Shield,
				label: 'Access',
				localeKey: 'access',
				to: 'settings/access',
			},
			{
				customPermission: () => role === AccessRole.CoCreator,
				icon: Bolt,
				label: 'Filters',
				localeKey: 'filters',
				to: 'settings/filters',
			},
		],
		label: 'Configuration',
	},
	{
		defaultRoute: 'settings/danger',
		items: [
			{
				icon: PackageX,
				label: 'Delete',
				localeKey: 'danger-zone/delete',
				// permission: 'bookclub:manage',
				to: 'settings/delete',
			},
		],
		label: 'Danger Zone',
	},
]
