import React from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getSeriesById } from '~api/query/series';
import MediaCard from '~components/media/MediaCard';

export default function Series() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Library id is required');
	}

	const { isLoading, data: series } = useQuery('getSeries', {
		queryFn: async () => getSeriesById(parseInt(id, 10)).then((res) => res.data),
	});

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!series) {
		throw new Error('Series not found');
	}

	return (
		<div className="flex flex-col space-y-4">
			<h1 className="text-lg font-bold text-gray-100">{series.title}</h1>

			<div className="flex flex-wrap gap-4">
				{series.media.map((m) => (
					<MediaCard {...m} />
				))}
			</div>
		</div>
	);
}
