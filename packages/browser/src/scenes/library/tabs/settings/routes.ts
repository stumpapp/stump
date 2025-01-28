import {
	BookOpenText,
	FlaskRound,
	Image,
	NotebookTabs,
	PackageX,
	ScanSearch,
	ShieldCheck,
} from 'lucide-react'

import { RouteGroup } from '@/hooks/useRouteGroups'

export const routeGroups: RouteGroup[] = [
	{
		defaultRoute: 'settings/basics',
		items: [
			{
				icon: NotebookTabs,
				label: 'Basics',
				localeKey: 'basics',
				// TODO: I the parent pretty much asserts library:manage, so this will never actually
				// allow a user with just library:edit to access this route. I should probably fix that.
				permission: 'library:edit',
				to: 'settings/basics',
			},
		],
	},
	{
		defaultRoute: 'settings/options/scanning',
		items: [
			{
				icon: BookOpenText,
				label: 'Reading',
				localeKey: 'options/reading',
				permission: 'library:edit',
				to: 'settings/reading',
			},
			{
				icon: ScanSearch,
				label: 'Scanning',
				localeKey: 'options/scanning',
				permission: 'library:manage',
				to: 'settings/scanning',
			},
			{
				icon: Image,
				label: 'Thumbnails',
				localeKey: 'options/thumbnails',
				permission: 'library:manage',
				to: 'settings/thumbnails',
			},
			{
				icon: FlaskRound,
				label: 'Analysis',
				localeKey: 'options/analysis',
				permission: 'library:manage',
				to: 'settings/analysis',
			},
		],
		label: 'Options',
	},
	{
		defaultRoute: 'settings/danger',
		items: [
			{
				icon: ShieldCheck,
				label: 'Access Control',
				localeKey: 'danger-zone/access-control',
				permission: 'library:manage',
				to: 'settings/access-control',
			},
			{
				icon: PackageX,
				label: 'Delete',
				localeKey: 'danger-zone/delete',
				permission: 'library:delete',
				to: 'settings/delete',
			},
		],
		label: 'Danger Zone',
	},
]
