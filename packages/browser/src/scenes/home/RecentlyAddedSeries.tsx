import { useSDK, useSeriesCursorQuery } from '@stump/client'
import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookCopy } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import HorizontalCardList from '@/components/HorizontalCardList'
import SeriesCard from '@/components/series/SeriesCard'

function RecentlyAddedSeries() {
	const { sdk } = useSDK()
	const { t } = useLocaleContext()
	const { series, fetchNextPage, hasNextPage, isFetching } = useSeriesCursorQuery({
		limit: 20,
		params: {
			count_media: true,
			direction: 'desc',
			order_by: 'created_at',
		},
		queryKey: [sdk.series.keys.recentlyAdded],
		suspense: true,
	})

	const cards = series.map((series) => (
		<SeriesCard series={series} key={series.id} fullWidth={false} />
	))

	const handleFetchMore = useCallback(() => {
		if (!hasNextPage || isFetching) {
			return
		} else {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetching])

	return (
		<HorizontalCardList
			title={t('homeScene.recentlyAddedSeries.title')}
			items={cards}
			onFetchMore={handleFetchMore}
			emptyState={
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookCopy className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>{t('homeScene.recentlyAddedSeries.emptyState.heading')}</Text>
						<Text size="sm" variant="muted">
							{t('homeScene.recentlyAddedSeries.emptyState.message')}
						</Text>
					</div>
				</div>
			}
		/>
	)
}

export default function RecentlyAddedSeriesContainer() {
	return (
		<Suspense>
			<RecentlyAddedSeries />
		</Suspense>
	)
}
