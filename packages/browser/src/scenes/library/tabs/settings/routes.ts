import { UserPermission } from '@stump/types'
import {
	AlarmClock,
	Bell,
	Book,
	Box,
	Brush,
	Cog,
	Image,
	LucideIcon,
	Mail,
	NotebookTabs,
	PackageX,
	PcCase,
	ScrollText,
	ShieldCheck,
	Users,
} from 'lucide-react'

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
		defaultRoute: 'settings/file-options',
		items: [
			{
				icon: Cog,
				label: 'General',
				localeKey: 'file-options/general',
				permission: 'library:manage',
				to: 'settings/file-options/general',
			},
			{
				icon: Image,
				label: 'Thumbnails',
				localeKey: 'file-options/thumbnails',
				permission: 'library:manage',
				to: 'settings/file-options/thumbnails',
			},
		],
		label: 'File Options',
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
