import { useMemo } from 'react';
import { HStack } from '@chakra-ui/react';
import { useLibraryStats, useQueryParamStore } from '@stump/client';
import { formatBytesSeparate } from '../../utils/format';
import AnimatedStat from '../../ui/AnimatedStat';

// Note: I don't ~love~ the plural here, but I want to make sure it is understood it
// encompasses *all* libraries, not just one.
export default function LibrariesStats() {
	const { libraryStats } = useLibraryStats();

	const libraryUsage = useMemo(() => {
		return formatBytesSeparate(libraryStats?.totalBytes);
	}, [libraryStats?.totalBytes]);

	if (!libraryStats || !libraryUsage) return null;

	return (
		<HStack spacing={4}>
			<AnimatedStat value={libraryStats.seriesCount} label="Total Series" />
			<AnimatedStat value={libraryStats.bookCount} label="Total Books" />
			<AnimatedStat
				value={libraryUsage.value}
				label="Space Used"
				unit={libraryUsage.unit}
				decimal={true}
			/>
		</HStack>
	);
}
