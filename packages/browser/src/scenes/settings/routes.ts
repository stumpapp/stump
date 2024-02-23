import {
	AlarmClock,
	Bell,
	Brush,
	Cog,
	LucideIcon,
	PcCase,
	ScrollText,
	ShieldCheck,
	Users,
} from 'lucide-react'

type SubItem = {
	localeKey: string
	matcher: (path: string) => boolean
}

type Route = {
	icon: LucideIcon
	label: string
	localeKey: string
	permission?: string
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
						localeKey: 'server/users.createUser',
						matcher: (path: string) => path.startsWith('/settings/server/users/create'),
					},
					{
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
