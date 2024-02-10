import { LibrariesStats } from '@stump/types'
import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { formatBytesSeparate } from '../../utils/format'

export default function LibraryStatsCard({ stats }: { stats: LibrariesStats }) {
	const libraryUsage = useMemo(() => {
		return formatBytesSeparate(stats?.total_bytes as bigint)
	}, [stats?.total_bytes])

	return (
		<View className="h-30 my-5 flex flex-row justify-around rounded-md bg-gray-200 p-5">
			<_StatsItem label="Total Series" value={stats.series_count as bigint} />
			<_StatsItem label="Total Books" value={stats.book_count as bigint} />
			<_StatsItem label="Space Used" value={`${libraryUsage.value} ${libraryUsage.unit}`} />
		</View>
	)
}

const _StatsItem = ({ label, value }: { label: string; value: number | bigint | string }) => {
	return (
		<View className="flex justify-between">
			<Text className="font-medium md:text-lg">{label}</Text>
			<Text className="md:text-lg">{`${value}`}</Text>
		</View>
	)
}
