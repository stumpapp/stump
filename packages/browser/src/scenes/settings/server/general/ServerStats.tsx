import { useSuspenseGraphQL } from '@stump/client'
import { Statistic } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useMemo } from 'react'

import { formatBytesSeparate } from '@/utils/format'

const query = graphql(`
	query ServerStats {
		numberOfLibraries
		numberOfSeries
		mediaCount
		mediaDiskUsage
	}
`)

export default function ServerStats() {
	const { data } = useSuspenseGraphQL(query, ['serverStats'])

	const stats = useMemo(
		() => ({
			seriesCount: data.numberOfSeries,
			bookCount: data.mediaCount,
			libraryCount: data.numberOfLibraries,
			diskUsage: formatBytesSeparate(data.mediaDiskUsage),
		}),
		[data],
	)

	return (
		<div className="flex max-w-xl items-center justify-around gap-4 divide-x divide-edge">
			<Statistic className="pr-10">
				<Statistic.Label>Libraries</Statistic.Label>
				<Statistic.CountUpNumber value={Number(stats.libraryCount)} />
			</Statistic>

			<Statistic className="px-10">
				<Statistic.Label>Series</Statistic.Label>
				<Statistic.CountUpNumber value={Number(stats.seriesCount)} />
			</Statistic>

			<Statistic className="px-10">
				<Statistic.Label>Books</Statistic.Label>
				<Statistic.CountUpNumber value={Number(stats.bookCount)} />
			</Statistic>

			<Statistic className="pl-10">
				<Statistic.Label>Disk Usage</Statistic.Label>
				<Statistic.CountUpNumber
					unit={stats.diskUsage?.unit || 'B'}
					value={stats.diskUsage?.value || 0}
					decimal={true}
				/>
			</Statistic>
		</div>
	)
}
