import { AlarmClock, Bell, Brush, Cog, PcCase, ShieldCheck, Users } from 'lucide-react'

// TODO: permission guards
export const routeGroups = [
	{
		defaultRoute: '/settings/app/general',
		items: [
			{
				icon: Cog,
				label: 'General',
				localeKey: 'app/general',
				to: '/settings/app/general',
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
				to: '/settings/server/general',
			},
			{
				icon: AlarmClock,
				label: 'Jobs',
				localeKey: 'server/jobs',
				to: '/settings/server/jobs',
			},
			{
				icon: Users,
				label: 'Users',
				localeKey: 'server/users',
				subItems: [
					{
						localeKey: 'server/users.createUser',
						matcher: (path: string) => path.startsWith('/settings/server/users/create'),
					},
					{
						localeKey: 'server/users.updateUser',
						matcher: (path: string) => {
							const match = path.match(/\/settings\/server\/users\/[a-zA-Z0-9]+\/manage/)
							return match && match.length > 0
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
				to: '/settings/server/access',
			},
			{
				disabled: true,
				icon: Bell,
				label: 'Notifications',
				localeKey: 'server/notifications',
				to: '/settings/server/notifications',
			},
		],
		label: 'Server',
	},
]
