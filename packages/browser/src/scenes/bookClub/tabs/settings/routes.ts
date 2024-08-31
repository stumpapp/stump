import { CalendarCheck, NotebookTabs, PackageX, Sliders, Tag, Users } from 'lucide-react'

import { RouteGroup } from '@/hooks/useRouteGroups'

export const routeGroups: RouteGroup[] = [
	{
		defaultRoute: 'settings/basics',
		items: [
			{
				icon: NotebookTabs,
				label: 'Basics',
				localeKey: 'basics',
				// permission: 'bookclub:manage',
				to: 'settings/basics',
			},
		],
	},
	{
		defaultRoute: 'members',
		items: [
			{
				icon: Users,
				label: 'Members',
				localeKey: 'members',
				// permission: 'bookclub:manage',
				to: 'settings/members',
			},
			{
				icon: Tag,
				label: 'Roles',
				localeKey: 'roles',
				// permission: 'bookclub:manage',
				to: 'settings/roles',
			},
		],
		label: 'Members',
	},
	{
		defaultRoute: 'settings/scheduling',
		items: [
			{
				icon: CalendarCheck,
				label: 'Scheduler',
				localeKey: 'settings/scheduling',
				// permission: 'bookclub:manage',
				to: 'settings/scheduling',
			},
			{
				icon: Sliders,
				label: 'Options',
				localeKey: 'settings/scheduling/options',
				// permission: 'bookclub:manage',
				to: 'settings/scheduling/options',
			},
		],
		label: 'Scheduling',
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
