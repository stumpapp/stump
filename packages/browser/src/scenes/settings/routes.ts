import { UserPermission } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import {
	AlarmClock,
	Bell,
	BookOpen,
	Brush,
	KeyRound,
	LucideIcon,
	Mail,
	PcCase,
	ScrollText,
	Server,
	UserCircle,
	Users,
} from 'lucide-react'

import { prefetchScheduler } from './server/jobs/JobScheduler'
import { prefetchJobs } from './server/jobs/JobTable'

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
	prefetch?: () => void
}

type RouteGroup = {
	defaultRoute: string
	items: Route[]
	label: string
}

export const createRouteGroups = (client: QueryClient, api: Api): RouteGroup[] => [
	{
		defaultRoute: '/settings/app/account',
		items: [
			{
				icon: UserCircle,
				label: 'Account',
				localeKey: 'app/account',
				to: '/settings/account',
			},
			{
				icon: Brush,
				label: 'Appearance',
				localeKey: 'app/preferences',
				to: '/settings/preferences',
			},
			{
				icon: BookOpen,
				label: 'Reader',
				localeKey: 'app/reader',
				to: '/settings/reader',
			},
			{
				icon: KeyRound,
				label: 'API keys',
				localeKey: 'app/apiKeys',
				permission: UserPermission.AccessApiKeys,
				to: '/settings/api-keys',
			},
			{
				icon: PcCase,
				label: 'Desktop',
				localeKey: 'app/desktop',
				to: '/settings/desktop',
			},
		],
		label: 'Personal',
	},
	{
		defaultRoute: '/settings/server',
		items: [
			{
				icon: Server,
				label: 'General',
				localeKey: 'server/general',
				permission: UserPermission.ManageServer,
				to: '/settings/server',
			},
			{
				icon: ScrollText,
				label: 'Logs',
				localeKey: 'server/logs',
				permission: UserPermission.ManageServer,
				to: '/settings/logs',
			},
			{
				icon: AlarmClock,
				label: 'Jobs',
				localeKey: 'server/jobs',
				permission: UserPermission.ReadJobs,
				to: '/settings/jobs',
				prefetch: () => Promise.all([prefetchJobs(client, api), prefetchScheduler(client, api)]),
			},
			{
				icon: Users,
				label: 'Users',
				localeKey: 'server/users',
				permission: UserPermission.ManageUsers,
				subItems: [
					{
						backlink: {
							localeKey: 'server/users.title',
							to: '/settings/users',
						},
						localeKey: 'server/users.createUser',
						matcher: (path: string) => path.startsWith('/settings/users/create'),
					},
					{
						backlink: {
							localeKey: 'server/users.title',
							to: '/settings/users',
						},
						localeKey: 'server/users.updateUser',
						matcher: (path: string) => {
							const match = path.match(/\/settings\/server\/users\/[a-zA-Z0-9]+\/manage/)
							return !!match && match.length > 0
						},
					},
				],
				to: '/settings/users',
			},
			// {
			// 	disabled: true,
			// 	icon: ShieldCheck,
			// 	label: 'Access',
			// 	localeKey: 'server/access',
			// 	permission: 'server:manage',
			// 	to: '/settings/server/access',
			// },
			{
				icon: Mail,
				label: 'Email',
				localeKey: 'server/email',
				permission: UserPermission.EmailerRead,
				subItems: [
					{
						backlink: {
							localeKey: 'server/email.title',
							to: '/settings/email',
						},
						localeKey: 'server/email.createEmailer',
						matcher: (path: string) => path.startsWith('/settings/email/new'),
					},
					{
						backlink: {
							localeKey: 'server/email.title',
							to: '/settings/email',
						},
						localeKey: 'server/email.updateEmailer',
						matcher: (path: string) => {
							const match = path.match(/\/settings\/email\/[0-9]+\/edit/)
							return !!match && match.length > 0
						},
					},
				],
				to: '/settings/email',
			},
			{
				disabled: true,
				icon: Bell,
				label: 'Notifications',
				localeKey: 'server/notifications',
				permission: UserPermission.ReadNotifier,
				to: '/settings/notifications',
			},
		],
		label: 'Management',
	},
]
