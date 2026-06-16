import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { BookCopy } from 'lucide-react'
import { Suspense, useCallback, useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import { StackedSeriesCard } from '@/components/series'
import { usePreferences } from '@/hooks/usePreferences'

const query = graphql(`
	query RecentlyAddedSeries($pagination: Pagination!) {
		recentlyAddedSeries(pagination: $pagination) {
			nodes {
				id
				resolvedName
				mediaCount
				percentageCompleted
				status
				createdAt
				media(take: 2, skip: 1) {
					id
					resolvedName
					thumbnail {
						url
						metadata {
							averageColor
							colors {
								color
								percentage
							}
							thumbhash
						}
					}
				}
				thumbnail {
					url
					metadata {
						averageColor
						colors {
							color
							percentage
						}
						thumbhash
					}
				}
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
			queryKey: ['recentlyAddedSeries2'],
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
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const cardWidth = isAtLeastMedium ? 200 : 160

	const cardHeight = useMemo(() => {
		const baseThumbnailWidth = cardWidth * 0.7
		const baseThumbnailHeight = baseThumbnailWidth / thumbnailRatio
		return baseThumbnailHeight + 100 // Extra space between thumbs and title text
	}, [cardWidth, thumbnailRatio])

	const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['recentlyAddedSeries2'],
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

	const emptyState = (
		<div className="space-x-3 px-4 py-4 flex items-start justify-start rounded-lg border border-dashed border-border">
			<span className="p-2 rounded-lg border border-border bg-muted">
				<BookCopy className="h-8 w-8 text-muted-foreground" />
			</span>
			<div>
				<Text>{t('homeScene.recentlyAddedSeries.emptyState.heading')}</Text>
				<Text size="sm" variant="muted">
					{t('homeScene.recentlyAddedSeries.emptyState.message')}
				</Text>
			</div>
		</div>
	)

	return (
		<MultiRowHorizontalCardList
			title={t('homeScene.recentlyAddedSeries.title')}
			items={nodes}
			keyExtractor={(series) => series.id}
			renderItem={(series) => (
				<StackedSeriesCard
					id={series.id}
					name={series.resolvedName}
					subtitle={formatDistanceToNow(new Date(series.createdAt), { addSuffix: true })}
					isMissing={series.status === 'MISSING'}
					width={cardWidth}
					thumbnailData={[series.thumbnail, ...series.media.map((m) => m.thumbnail)]}
				/>
			)}
			cardHeight={cardHeight}
			onFetchMore={handleFetchMore}
			emptyState={emptyState}
		/>
	)
}

export default function RecentlyAddedSeries2Container() {
	return (
		<Suspense>
			<RecentlyAddedSeries />
		</Suspense>
	)
}
