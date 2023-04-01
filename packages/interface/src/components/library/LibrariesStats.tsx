import { useLibraryStats } from '@stump/client'
import { Statistic } from '@stump/components'
import { useMemo } from 'react'

import { formatBytesSeparate } from '../../utils/format'

// Note: I don't ~love~ the plural here, but I want to make sure it is understood it
// encompasses *all* libraries, not just one.
export default function LibrariesStats() {
	const { libraryStats } = useLibraryStats()

	const libraryUsage = useMemo(() => {
		return formatBytesSeparate(libraryStats?.total_bytes as bigint | undefined)
	}, [libraryStats?.total_bytes])

	if (!libraryStats || !libraryUsage) return null

	return (
		<div className="flex items-center gap-4">
			<Statistic>
				<Statistic.Label>Total Series</Statistic.Label>
				<Statistic.CountUpNumber value={Number(libraryStats.series_count)} />
			</Statistic>

			<Statistic>
				<Statistic.Label>Total Books</Statistic.Label>
				<Statistic.CountUpNumber value={Number(libraryStats.book_count)} />
			</Statistic>

			<Statistic>
				<Statistic.Label>Disk Usage</Statistic.Label>
				<Statistic.CountUpNumber
					unit={libraryUsage.unit}
					value={libraryUsage.value}
					decimal={true}
				/>
			</Statistic>
		</div>
	)
}
