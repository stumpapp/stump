import { UserPermission } from '@stump/types'
import { Image, LucideIcon, NotebookTabs, PackageX, ScanSearch, ShieldCheck } from 'lucide-react'

// TODO(284): This is a copy of another hook, even the types. Generalize this instead!

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
	to: string
	subItems?: SubItem[]
	disabled?: boolean
}

type RouteGroup = {
	defaultRoute: string
	items: Route[]
	label?: string
}

export const routeGroups: RouteGroup[] = [
	{
		defaultRoute: 'settings/basics',
		items: [
			{
				icon: NotebookTabs,
				label: 'Basics',
				localeKey: 'basics',
				to: 'settings/basics',
			},
		],
	},
	{
		defaultRoute: 'settings/options/scanning',
		items: [
			{
				icon: ScanSearch,
				label: 'Scanning',
				localeKey: 'options/scanning',
				permission: 'library:manage',
				to: 'settings/options/scanning',
			},
			{
				icon: Image,
				label: 'Thumbnails',
				localeKey: 'options/thumbnails',
				permission: 'library:manage',
				to: 'settings/options/thumbnails',
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
				to: 'settings/danger/access-control',
			},
			{
				icon: PackageX,
				label: 'Delete',
				localeKey: 'danger-zone/delete',
				permission: 'library:delete',
				to: 'settings/danger/delete',
			},
		],
		label: 'Danger Zone',
	},
]
