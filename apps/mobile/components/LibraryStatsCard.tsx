import { LibrariesStats } from '@stump/types'
import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { formatBytesSeparate } from '../utils/format'

export default function LibraryStatsCard({ stats }: { stats: LibrariesStats }) {
	const libraryUsage = useMemo(() => {
		return formatBytesSeparate(stats?.total_bytes)
	}, [stats?.total_bytes])

	return (
		<View className="h-30 bg-gray-100 flex flex-row justify-around p-5 m-5 rounded-md">
			<_StatsItem label="Total Series" value={stats.series_count} />
			<_StatsItem label="Total Books" value={stats.book_count} />
			<_StatsItem label="Space Used" value={`${libraryUsage.value} ${libraryUsage.unit}`} />
		</View>
	)
}

const _StatsItem = ({ label, value }: { label: string; value: number | bigint | string }) => {
	return (
		<View className="flex justify-between">
			<Text className="font-medium text-lg">{label}</Text>
			<Text className="text-lg">{`${value}`}</Text>
		</View>
	)
}
