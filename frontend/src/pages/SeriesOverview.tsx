import { Heading, Wrap, WrapItem } from '@chakra-ui/react';
import React from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getSeriesById } from '~api/query/series';
import MediaCard from '~components/Media/MediaCard';

export default function SeriesOverview() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Library id is required');
	}

	const { isLoading, data: series } = useQuery('getSeries', {
		queryFn: async () => getSeriesById(id).then((res) => res.data),
	});

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!series) {
		throw new Error('Series not found');
	}

	return (
		<div className="flex flex-col space-y-4 p-4">
			<Heading as="h3" size="md" fontWeight="bold">
				{series.name}
			</Heading>

			<Wrap align="center">
				{series.media.map((m) => (
					<WrapItem>
						<MediaCard {...m} />
					</WrapItem>
				))}
			</Wrap>
		</div>
	);
}
