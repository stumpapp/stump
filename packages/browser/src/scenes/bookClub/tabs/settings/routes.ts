import { CalendarCheck, NotebookTabs, PackageX, Sliders } from 'lucide-react'

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
				to: 'settings/danger/delete',
			},
		],
		label: 'Danger Zone',
	},
]
