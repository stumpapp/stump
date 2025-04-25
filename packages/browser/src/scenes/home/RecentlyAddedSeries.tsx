import { useSuspenseQuery } from '@apollo/client'
import { getNextPageParam } from '@stump/client'
import { updateQuery } from '@stump/client'
import { Text } from '@stump/components'
import { graphql, PaginationInfo } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { BookCopy } from 'lucide-react'
import { Suspense, useCallback, useTransition } from 'react'

import HorizontalCardList from '@/components/HorizontalCardList'
import SeriesCard from '@/components/series/SeriesCard'

const query = graphql(`
	query RecentlyAddedSeriesQuery($pagination: Pagination!) {
		recentlyAddedSeries(pagination: $pagination) {
			nodes {
				id
				...SeriesCard
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
					limit
				}
			}
		}
	}
`)

function RecentlyAddedSeries() {
	const [, startTransition] = useTransition()
	const {
		data: {
			recentlyAddedSeries: { nodes, pageInfo },
		},
		fetchMore,
	} = useSuspenseQuery(query, {
		variables: {
			pagination: { cursor: { limit: 20 } },
		},
		queryKey: ['recentlyAddedSeries'],
	})
	const { t } = useLocaleContext()

	const handleFetchMore = useCallback(() => {
		const nextPageParam = getNextPageParam(pageInfo as PaginationInfo)
		if (nextPageParam) {
			startTransition(() => {
				fetchMore({
					variables: {
						pagination: nextPageParam,
					},
					updateQuery,
				})
			})
		}
	}, [fetchMore, pageInfo])

	const cards = nodes.map((node) => (
		<Suspense key={node.id}>
			<SeriesCard id={node.id} fullWidth={false} />
		</Suspense>
	))

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
