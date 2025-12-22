import { UserPermission } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import {
	AlarmClock,
	Bell,
	BookOpen,
	Brush,
	KeyRound,
	Mail,
	PcCase,
	ScrollText,
	Server,
	UserCircle,
	Users,
} from 'lucide-react'

import { RouteGroup } from '@/hooks/useRouteGroups'

import { prefetchScheduler } from './server/jobs/JobScheduler'
import { prefetchJobs } from './server/jobs/JobTable'
import { prefetchLoginActivity, prefetchUsersTable, prefetchUserStats } from './server/users'

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
				permissions: [UserPermission.AccessApiKeys],
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
				permissions: [UserPermission.ManageServer],
				to: '/settings/server',
			},
			{
				icon: ScrollText,
				label: 'Logs',
				localeKey: 'server/logs',
				permissions: [UserPermission.ManageServer],
				to: '/settings/logs',
			},
			{
				icon: AlarmClock,
				label: 'Jobs',
				localeKey: 'server/jobs',
				permissions: [UserPermission.ReadJobs],
				to: '/settings/jobs',
				prefetch: () => Promise.all([prefetchJobs(client, api), prefetchScheduler(client, api)]),
			},
			{
				icon: Users,
				label: 'Users',
				localeKey: 'server/users',
				permissions: [UserPermission.ManageUsers],
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
				prefetch: async () => {
					await Promise.all([
						prefetchUserStats(api, client),
						prefetchUsersTable(api, client),
						prefetchLoginActivity(api, client),
					])
				},
			},
			{
				icon: Mail,
				label: 'Email',
				localeKey: 'server/email',
				permissions: [UserPermission.EmailerRead],
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
				permissions: [UserPermission.ReadNotifier],
				to: '/settings/notifications',
			},
		],
		label: 'Management',
	},
]
