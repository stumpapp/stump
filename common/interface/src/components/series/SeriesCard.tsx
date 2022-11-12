import { prefetchSeries, Series } from '@stump/client';
import { Progress, Text, useBoolean, useColorModeValue } from '@chakra-ui/react';
import { getSeriesThumbnail } from '@stump/client/api';
import pluralizeStat from '../../utils/pluralize';
import Card, { CardBody, CardFooter } from '../Card';

export type SeriesCardProps = {
	series: Series;
	fixed?: boolean;
};

export default function SeriesCard({ series, fixed }: SeriesCardProps) {
	const [isFallback, { on }] = useBoolean(false);

	const bookCount = Number(series.media ? series.media.length : series.media_count ?? 0);
	const unreadCount = series.unread_media_count;

	return (
		<Card
			variant={fixed ? 'fixedImage' : 'image'}
			to={`/series/${series.id}`}
			onMouseEnter={() => prefetchSeries(series.id)}
			title={series.name}
		>
			<CardBody p={0} className="relative">
				<img
					className="aspect-[2/3] object-cover min-h-full"
					src={isFallback ? '/fallbacks/image-file.svg' : getSeriesThumbnail(series.id)}
					alt={`Cover for ${series.name}`}
					onError={on}
				/>

				{!!unreadCount && Number(unreadCount) !== bookCount && (
					<div className="absolute bottom-0 left-0 w-full">
						<Progress
							value={bookCount - Number(unreadCount)}
							max={bookCount}
							w="full"
							size="xs"
							colorScheme="brand"
						/>
					</div>
				)}
			</CardBody>
			<CardFooter p={1} className="flex flex-col gap-1">
				{/* TODO: figure out how to make this not look like shit with 2 lines */}
				<Text fontSize="sm" as="h3" fontWeight="semibold" className="[hyphens:auto]" noOfLines={1}>
					{series.name}
				</Text>

				<Text fontSize="xs" color={useColorModeValue('gray.700', 'gray.300')} noOfLines={1}>
					{pluralizeStat('book', Number(bookCount))}
				</Text>
			</CardFooter>
		</Card>
	);
}
