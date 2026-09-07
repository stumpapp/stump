import { useSuspenseGraphQL } from '@stump/client'
import { STAT_COLORS, StatCard, StatCardProps } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Api } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useTheme } from '@/hooks/useTheme'

const query = graphql(`
	query UserStats {
		userCount
		topReaders(take: 1) {
			id
			username
			finishedReadingSessionsCount
		}
		activeReadingSessionCount
		finishedReadingSessionCount
	}
`)

export const prefetchUserStats = async (sdk: Api, client: QueryClient) =>
	client.prefetchQuery({
		queryKey: ['userStats'],
		queryFn: async () => {
			const data = await sdk.execute(query)
			return data
		},
	})

export default function UsersStats() {
	const { t } = useLocaleContext()
	const { isDarkVariant } = useTheme()
	const { data } = useSuspenseGraphQL(query, ['userStats'])

	const [powerReader] = useMemo(() => data.topReaders, [data.topReaders])

	const stats: StatCardProps[] = [
		{
			label: 'Users',
			value: data.userCount,
			colors: STAT_COLORS.system,
			countUp: true,
		},
		{
			label: 'Books completed',
			value: data.finishedReadingSessionCount,
			colors: STAT_COLORS.completed,
			countUp: true,
		},
		{
			label: 'Books in progress',
			value: data.activeReadingSessionCount,
			colors: STAT_COLORS.inProgress,
			countUp: true,
		},
		...(powerReader
			? [
					{
						label: t(getKey('topReader')),
						value: powerReader.username,
						suffix: t('common.xBooks', {
							count: powerReader.finishedReadingSessionsCount,
						}),
						colors: STAT_COLORS.system,
					},
				]
			: []),
	]

	return (
		<div data-testid="users-stats" className="gap-2 sm:grid-cols-4 grid grid-cols-2">
			{stats.map((stat, index) => (
				<StatCard key={index} {...stat} isDark={isDarkVariant} />
			))}
		</div>
	)
}

const getKey = (key: string) => `settingsScene.server/users.userStats.${key}`
