import { prefetchSeries } from '@stump/client';
import { getSeriesThumbnail } from '@stump/client/api';

import pluralizeStat from '../../utils/pluralize';
import Card from '../Card';

import type { Series } from '@stump/client';
export default function SeriesCard(series: Series) {
	const bookCount = series.media ? series.media.length : series.media_count ?? 0;

	return (
		<Card
			to={`/series/${series.id}`}
			imageAlt={series.name}
			imageSrc={getSeriesThumbnail(series.id)}
			onMouseEnter={() => prefetchSeries(series.id)}
			title={series.name}
			subtitle={pluralizeStat('book', Number(bookCount))}
			showMissingOverlay={series.status === 'MISSING'}
		/>
	);
}
