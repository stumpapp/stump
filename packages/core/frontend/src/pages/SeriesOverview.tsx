import React from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getSeriesById } from '~api/query/series';

import MediaGrid from '~components/Media/MediaGrid';
import MediaList from '~components/Media/MediaList';
import { useViewMode } from '~hooks/useViewMode';

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

	const { viewAsGrid } = useViewMode();

	return (
		<>
			<Helmet>
				<title>Stump | {series.name}</title>
			</Helmet>

			{viewAsGrid ? <MediaGrid media={series.media} /> : <MediaList media={series.media} />}
		</>
	);
}
