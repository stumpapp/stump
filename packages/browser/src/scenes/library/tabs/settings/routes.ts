import { UserPermission } from '@stump/graphql'
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
				permissions: [UserPermission.EditLibrary],
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
				permissions: [UserPermission.EditLibrary],
				to: 'settings/reading',
			},
			{
				icon: ScanSearch,
				label: 'Scanning',
				localeKey: 'options/scanning',
				permissions: [UserPermission.ManageLibrary],
				to: 'settings/scanning',
			},
			{
				icon: Image,
				label: 'Thumbnails',
				localeKey: 'options/thumbnails',
				permissions: [UserPermission.ManageLibrary],
				to: 'settings/thumbnails',
			},
			{
				icon: FlaskRound,
				label: 'Analysis',
				localeKey: 'options/analysis',
				permissions: [UserPermission.ManageLibrary],
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
				permissions: [UserPermission.ManageLibrary, UserPermission.ReadUsers],
				to: 'settings/access-control',
			},
			{
				icon: PackageX,
				label: 'Delete',
				localeKey: 'danger-zone/delete',
				permissions: [UserPermission.DeleteLibrary],
				to: 'settings/delete',
			},
		],
		label: 'Danger Zone',
	},
]
