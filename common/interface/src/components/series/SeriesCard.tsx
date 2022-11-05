import { prefetchSeries, Series } from '@stump/client';
import { Text, useBoolean, useColorModeValue } from '@chakra-ui/react';
import { getSeriesThumbnail } from '@stump/client/api';
import pluralizeStat from '../../utils/pluralize';
import Card, { CardBody, CardFooter } from '../Card';

export type SeriesCardProps = {
	series: Series;
};

export default function SeriesCard({ series }: SeriesCardProps) {
	const [isFallback, { on }] = useBoolean(false);

	const bookCount = series.media ? series.media.length : series.media_count ?? 0;
	const unreadCount = series.unread_media_count;

	return (
		<Card
			variant="image"
			to={`/series/${series.id}`}
			onMouseEnter={() => prefetchSeries(series.id)}
		>
			<CardBody p={0}>
				<img
					className="aspect-[2/3] object-cover min-h-full"
					src={isFallback ? '/fallbacks/image-file.svg' : getSeriesThumbnail(series.id)}
					onError={on}
				/>
			</CardBody>
			<CardFooter p={1} className="flex flex-col gap-1">
				<Text fontSize="sm" as="h3" fontWeight="semibold" className="[hyphens:auto]" noOfLines={1}>
					{series.name}
				</Text>

				<Text fontSize="xs" color={useColorModeValue('gray.700', 'gray.300')} noOfLines={1}>
					{pluralizeStat('book', Number(bookCount))}
					{!!unreadCount && ` • ${unreadCount} unread`}
				</Text>
			</CardFooter>
		</Card>
	);
}
