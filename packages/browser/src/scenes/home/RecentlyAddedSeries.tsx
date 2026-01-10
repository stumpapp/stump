import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { BookCopy } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import HorizontalCardList from '@/components/HorizontalCardList'
import SeriesCard from '@/components/series/SeriesCard'

const query = graphql(`
	query RecentlyAddedSeriesQuery($pagination: Pagination!) {
		recentlyAddedSeries(pagination: $pagination) {
			nodes {
				id
				resolvedName
				mediaCount
				percentageCompleted
				status
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

export const usePrefetchRecentlyAddedSeries = () => {
	const { sdk } = useSDK()
	const client = useQueryClient()
	return useCallback(() => {
		client.prefetchInfiniteQuery({
			queryKey: ['recentlyAddedSeries'],
			initialPageParam: {
				cursor: {
					limit: 20,
				},
			},
			queryFn: ({ pageParam }) => {
				return sdk.execute(query, {
					pagination: pageParam,
				})
			},
			staleTime: PREFETCH_STALE_TIME,
		})
	}, [sdk, client])
}

function RecentlyAddedSeries() {
	const { t } = useLocaleContext()
	const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['recentlyAddedSeries'],
		{
			pagination: { cursor: { limit: 20 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.recentlyAddedSeries.nodes)

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	const cards = nodes.map((node) => <SeriesCard key={node.id} data={node} fullWidth={false} />)

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
