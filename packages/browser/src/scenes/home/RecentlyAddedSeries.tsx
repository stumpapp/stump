import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { graphql, RecentlyAddedSeriesQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { BookCopy } from 'lucide-react'
import { Suspense, useCallback, useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import { SeriesStackedThumbnails } from '@/components/thumbnail'
import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'

dayjs.extend(relativeTime)

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
				media(take: 3) {
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

type RecentlyAddedSeriesCardProps = {
	series: RecentlyAddedSeriesQuery['recentlyAddedSeries']['nodes'][number]
	cardWidth: number
}

function RecentlyAddedSeriesCard({ series, cardWidth }: RecentlyAddedSeriesCardProps) {
	const thumbnailData = series.media.map((m) => m.thumbnail)

	return (
		<Link
			to={`/series/${series.id}`}
			className="group relative block flex-shrink-0 transition-opacity hover:opacity-90"
			style={{ width: cardWidth }}
		>
			<SeriesStackedThumbnails width={cardWidth} thumbnailData={thumbnailData} />

			<div className="absolute left-0 top-0 z-20 w-full px-2.5 py-3">
				<Text
					className="line-clamp-2 !text-wrap text-xl font-bold leading-tight text-white"
					style={{
						textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{series.resolvedName}
				</Text>
				<Text
					className="mt-0.5 line-clamp-1 text-sm font-medium leading-tight text-gray-200"
					style={{
						textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{dayjs(series.createdAt).fromNow()}
				</Text>
			</div>
		</Link>
	)
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
	)

	return (
		<MultiRowHorizontalCardList
			title={t('homeScene.recentlyAddedSeries.title')}
			items={nodes}
			keyExtractor={(series) => series.id}
			renderItem={(series) => <RecentlyAddedSeriesCard series={series} cardWidth={cardWidth} />}
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
