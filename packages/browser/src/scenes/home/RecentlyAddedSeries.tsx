import { seriesQueryKeys } from '@stump/api'
import { useSeriesCursorQuery } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { CircleSlash2 } from 'lucide-react'

import HorizontalCardList from '@/components/HorizontalCardList'
import SeriesCard from '@/components/series/SeriesCard'

export default function RecentlyAddedSeries() {
	const { t } = useLocaleContext()
	const { series, fetchNextPage, hasNextPage, isLoading } = useSeriesCursorQuery({
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
			title={t('homeScene.recentlyAddedSeries.title')}
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
			emptyMessage={() =>
				isLoading ? null : (
					<div className="flex min-h-[150px] flex-col items-start justify-center gap-2">
						<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
						<Heading size="sm">{t('homeScene.recentlyAddedSeries.emptyState.heading')}</Heading>
						<Text size="sm" variant="muted">
							{t('homeScene.recentlyAddedSeries.emptyState.message')}
						</Text>
					</div>
				)
			}
		/>
	)
}
