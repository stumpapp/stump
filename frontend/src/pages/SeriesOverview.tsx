import { Heading, Wrap, WrapItem } from '@chakra-ui/react';
import React from 'react';
import { Helmet } from 'react-helmet';
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
		<>
			<Helmet>
				<title>Stump | {series.name}</title>
			</Helmet>

			<div className="p-4 flex flex-wrap gap-4 items-center justify-center md:justify-start">
				{series.media.map((m) => (
					<MediaCard key={m.id} {...m} />
				))}
			</div>
		</>
	);
}
