import { UserPermission } from '@stump/types'
import {
	AlarmClock,
	Bell,
	Book,
	Brush,
	ChartArea,
	Cog,
	LucideIcon,
	Mail,
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
	label: string
}

// TODO: prefetch options
export const routeGroups: RouteGroup[] = [
	{
		defaultRoute: '/settings/app/account',
		items: [
			{
				icon: Cog,
				label: 'Account',
				localeKey: 'app/account',
				to: '/settings/app/account',
			},
			{
				icon: Brush,
				label: 'Appearance',
				localeKey: 'app/appearance',
				to: '/settings/app/appearance',
			},
			{
				icon: Book,
				label: 'Reader',
				localeKey: 'app/reader',
				to: '/settings/app/reader',
			},
			{
				icon: PcCase,
				label: 'Desktop',
				localeKey: 'app/desktop',
				to: '/settings/app/desktop',
			},
		],
		label: 'Application',
	},
	{
		defaultRoute: '/settings/server/general',
		items: [
			{
				icon: Cog,
				label: 'General',
				localeKey: 'server/general',
				permission: 'server:manage',
				to: '/settings/server/general',
			},
			{
				icon: ScrollText,
				label: 'Logs',
				localeKey: 'server/logs',
				permission: 'server:manage',
				to: '/settings/server/logs',
			},
			{
				icon: ChartArea,
				label: 'Stats',
				localeKey: 'server/stats',
				permission: 'server:manage',
				to: '/settings/server/stats',
			},
			{
				icon: AlarmClock,
				label: 'Jobs',
				localeKey: 'server/jobs',
				permission: 'server:manage',
				to: '/settings/server/jobs',
			},
			{
				icon: Users,
				label: 'Users',
				localeKey: 'server/users',
				permission: 'user:manage',
				subItems: [
					{
						backlink: {
							localeKey: 'server/users.title',
							to: '/settings/server/users',
						},
						localeKey: 'server/users.createUser',
						matcher: (path: string) => path.startsWith('/settings/server/users/create'),
					},
					{
						backlink: {
							localeKey: 'server/users.title',
							to: '/settings/server/users',
						},
						localeKey: 'server/users.updateUser',
						matcher: (path: string) => {
							const match = path.match(/\/settings\/server\/users\/[a-zA-Z0-9]+\/manage/)
							return !!match && match.length > 0
						},
					},
				],
				to: '/settings/server/users',
			},
			{
				disabled: true,
				icon: ShieldCheck,
				label: 'Access',
				localeKey: 'server/access',
				permission: 'server:manage',
				to: '/settings/server/access',
			},
			{
				icon: Mail,
				label: 'Email',
				localeKey: 'server/email',
				permission: 'emailer:read',
				subItems: [
					{
						backlink: {
							localeKey: 'server/email.title',
							to: '/settings/server/email',
						},
						localeKey: 'server/email.createEmailer',
						matcher: (path: string) => path.startsWith('/settings/server/email/new'),
					},
					{
						backlink: {
							localeKey: 'server/email.title',
							to: '/settings/server/email',
						},
						localeKey: 'server/email.updateEmailer',
						matcher: (path: string) => {
							const match = path.match(/\/settings\/server\/email\/[0-9]+\/edit/)
							return !!match && match.length > 0
						},
					},
				],
				to: '/settings/server/email',
			},
			{
				disabled: true,
				icon: Bell,
				label: 'Notifications',
				localeKey: 'server/notifications',
				permission: 'server:manage',
				to: '/settings/server/notifications',
			},
		],
		label: 'Server',
	},
]
