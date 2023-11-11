import { seriesQueryKeys } from '@stump/api'
import { useSeriesCursorQuery } from '@stump/client'

import HorizontalCardList from '@/components/HorizontalCardList'
import SeriesCard from '@/components/series/SeriesCard'

export default function RecentlyAddedSeries() {
	const { series, fetchNextPage, hasNextPage } = useSeriesCursorQuery({
		limit: 20,
		params: {
			count_media: true,
			direction: 'desc',
			order_by: 'created_at',
		},
		queryKey: [seriesQueryKeys.getRecentlyAddedSeries],
	})

	const cards = series.map((series) => (
		<SeriesCard series={series} key={series.id} fullWidth={false} />
	))

	return (
		<HorizontalCardList
			title="Recently Added Series"
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
		/>
	)
}
