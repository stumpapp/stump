import { useSuspenseGraphQL } from '@stump/client'
import { Statistic } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import pluralize from 'pluralize'
import { useMemo } from 'react'

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
	const { data } = useSuspenseGraphQL(query, ['userStats'])

	const [powerReader] = useMemo(() => data.topReaders, [data.topReaders])

	return (
		<div className="flex items-center gap-4 divide-x divide-edge-subtle overflow-x-scroll pb-8 scrollbar-hide">
			<Statistic className="shrink-0 pr-5 md:pr-10">
				<Statistic.Label>Users</Statistic.Label>
				<Statistic.CountUpNumber value={data.userCount} />
			</Statistic>

			<Statistic className="shrink-0 px-5 md:px-10">
				<Statistic.Label>Books completed</Statistic.Label>
				<Statistic.CountUpNumber value={data.finishedReadingSessionCount} />
			</Statistic>

			<Statistic className="shrink-0 px-5 md:px-10">
				<Statistic.Label>Books in progress</Statistic.Label>
				<Statistic.CountUpNumber value={data.activeReadingSessionCount} />
			</Statistic>

			{!!powerReader && (
				<Statistic className="shrink-0 pl-5 md:pl-10">
					<Statistic.Label>Power Reader</Statistic.Label>
					<Statistic.StringValue>
						{powerReader.username}{' '}
						<span className="text-sm font-normal">
							({powerReader.finishedReadingSessionsCount}{' '}
							{pluralize('book', powerReader.finishedReadingSessionsCount)})
						</span>
					</Statistic.StringValue>
				</Statistic>
			)}
		</div>
	)
}
