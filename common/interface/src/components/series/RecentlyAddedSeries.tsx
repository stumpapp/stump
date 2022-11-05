import { useRecentlyAddedSeries } from '@stump/client';
import SlidingCardList from '../SlidingCardList';
import SeriesCard from './SeriesCard';

export default function RecentlyAddedSeries() {
	const { series, isLoading, hasMore, nextPage } = useRecentlyAddedSeries();

	if (isLoading || !series?.data.length) {
		return null;
	}

	function handleScrollEnd() {
		console.log('handleScrollEnd');
		if (hasMore()) {
			nextPage();
		}
	}

	return (
		<SlidingCardList
			title="Recently Added Series"
			onScrollEnd={handleScrollEnd}
			isLoadingNext={isLoading}
		>
			{series.data.map((series) => (
				<SeriesCard key={series.id} series={series} />
			))}
		</SlidingCardList>
	);
}
