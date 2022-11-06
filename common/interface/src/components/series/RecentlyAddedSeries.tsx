import { useRecentlyAddedSeries } from '@stump/client';
import SlidingCardList from '../SlidingCardList';
import SeriesCard from './SeriesCard';

export default function RecentlyAddedSeries() {
	const { data, isLoading } = useRecentlyAddedSeries();

	if (isLoading || !data) {
		return null;
	}

	return (
		<SlidingCardList title="Recently Added Series" isLoadingNext={isLoading}>
			{data.map((series) => (
				<SeriesCard key={series.id} series={series} />
			))}
		</SlidingCardList>
	);
}
