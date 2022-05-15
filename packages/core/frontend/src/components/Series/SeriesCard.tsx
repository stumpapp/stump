import React from 'react';
import client from '~api/client';
import { getSeriesById, getSeriesThumbnail } from '~api/query/series';
import pluralizeStat from '~util/pluralize';

import Card from '~components/Card';

interface Props extends SeriesWithMedia {}
// TODO: figure out overflow stuff for the way this is styled. really long titles are a problem.
export default function SeriesCard({ ...series }: Props) {
	const prefetchSeries = async () => {
		await client.prefetchQuery(['getSeries', series.id], () => getSeriesById(series.id), {
			staleTime: 10 * 1000,
		});
	};

	return (
		<Card
			to={`/series/${series.id}`}
			imageAlt={series.name}
			imageSrc={getSeriesThumbnail(series.id)}
			onMouseEnter={prefetchSeries}
			title={series.name}
			subtitle={pluralizeStat('book', series.media.length)}
		/>
	);
}
