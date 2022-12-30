import { HStack } from '@chakra-ui/react'
import { useLibraryStats, useQueryParamStore } from '@stump/client'
import { useMemo } from 'react'

import AnimatedStat from '../../ui/AnimatedStat'
import { formatBytesSeparate } from '../../utils/format'

// Note: I don't ~love~ the plural here, but I want to make sure it is understood it
// encompasses *all* libraries, not just one.
export default function LibrariesStats() {
	const { libraryStats } = useLibraryStats()

	const libraryUsage = useMemo(() => {
		return formatBytesSeparate(libraryStats?.total_bytes)
	}, [libraryStats?.total_bytes])

	if (!libraryStats || !libraryUsage) return null

	return (
		<HStack spacing={4}>
			<AnimatedStat value={libraryStats.series_count} label="Total Series" />
			<AnimatedStat value={libraryStats.book_count} label="Total Books" />
			<AnimatedStat
				value={libraryUsage.value}
				label="Space Used"
				unit={libraryUsage.unit}
				decimal={true}
			/>
		</HStack>
	)
}
