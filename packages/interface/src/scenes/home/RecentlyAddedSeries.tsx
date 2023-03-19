import { useRecentlyAddedSeries } from '@stump/client'

import SeriesCard from '../../components/series/SeriesCard'
import SlidingCardList from '../../components/SlidingCardList'

// TODO: better empty state
export default function RecentlyAddedSeries() {
	const { data, isLoading, hasMore, fetchMore } = useRecentlyAddedSeries()

	if (isLoading || !data) {
		return null
	}

	return (
		<SlidingCardList
			title="Recently Added Series"
			cards={data.map((series) => (
				<SeriesCard key={series.id} series={series} fixed />
			))}
			isLoadingNext={isLoading}
			hasNext={hasMore}
			onScrollEnd={fetchMore}
		/>
	)
}
