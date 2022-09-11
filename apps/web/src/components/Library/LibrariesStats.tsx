import React, { useMemo } from 'react';
import { HStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { getLibrariesStats } from '~api/library';
import { formatBytesSeparate } from '~util/format';
import AnimatedStat from '~ui/AnimatedStat';

// Note: I don't ~love~ the plural here, but I want to make sure it is understood it
// encompasses *all* libraries, not just one.
export default function LibrariesStats() {
	const { data: libraryStats } = useQuery(['getLibrariesStats'], () =>
		getLibrariesStats().then((data) => data.data),
	);

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
