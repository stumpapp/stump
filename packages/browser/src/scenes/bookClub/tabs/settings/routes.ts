import { CalendarCheck, NotebookTabs, PackageX, Sliders, Tag, Users } from 'lucide-react'

import { RouteGroup } from '@/hooks/useRouteGroups'

export const createRouteGroups = (slug: string): RouteGroup[] => [
	{
		defaultRoute: `/clubs/${slug}/settings/basics`,
		items: [
			{
				icon: NotebookTabs,
				label: 'Basics',
				localeKey: 'basics',
				// permission: 'bookclub:manage',
				to: `/clubs/${slug}/settings/basics`,
			},
		],
	},
	{
		defaultRoute: `/clubs/${slug}/settings/members`,
		items: [
			{
				icon: Users,
				label: 'Members',
				localeKey: 'members',
				// permission: 'bookclub:manage',
				to: `/clubs/${slug}/settings/members`,
			},
			{
				icon: Tag,
				label: 'Roles',
				localeKey: 'roles',
				// permission: 'bookclub:manage',
				to: `/clubs/${slug}/settings/roles`,
			},
		],
		label: 'Members',
	},
	{
		defaultRoute: `/clubs/${slug}/settings/scheduler`,
		items: [
			{
				icon: CalendarCheck,
				label: 'Scheduler',
				localeKey: 'scheduling/scheduler',
				// permission: 'bookclub:manage',
				to: `/clubs/${slug}/settings/scheduler`,
			},
			{
				icon: Sliders,
				label: 'Options',
				localeKey: 'scheduling/options',
				// permission: 'bookclub:manage',
				to: `/clubs/${slug}/settings/scheduler-options`,
			},
		],
		label: 'Scheduling',
	},
	{
		defaultRoute: `/clubs/${slug}/settings/delete`,
		items: [
			{
				icon: PackageX,
				label: 'Delete',
				localeKey: 'danger-zone/delete',
				// permission: 'bookclub:manage',
				to: `/clubs/${slug}/settings/delete`,
			},
		],
		label: 'Danger Zone',
	},
]
