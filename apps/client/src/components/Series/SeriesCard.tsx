import React from 'react';
import client from '~api/client';
import { getSeriesById, getSeriesThumbnail } from '~api/series';
import pluralizeStat from '~util/pluralize';

import Card from '~components/Card';
import { Series } from '@stump/core';

interface Props extends Series {}
// TODO: figure out overflow stuff for the way this is styled. really long titles are a problem.
export default function SeriesCard({ ...series }: Props) {
	const prefetchSeries = async () => {
		await client.prefetchQuery(['getSeries', series.id], () => getSeriesById(series.id), {
			staleTime: 10 * 1000,
		});
	};

	const bookCount = series.media ? series.media.length : series.mediaCount ?? 0;

	return (
		<Card
			to={`/series/${series.id}`}
			imageAlt={series.name}
			imageSrc={getSeriesThumbnail(series.id)}
			onMouseEnter={prefetchSeries}
			title={series.name}
			subtitle={pluralizeStat('book', bookCount)}
		/>
	);
}
