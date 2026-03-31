import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { cn, Text } from '@stump/components'
import { graphql, RecentlyAddedSeriesQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { BookCopy } from 'lucide-react'
import { Suspense, useCallback, useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import { SeriesStackedThumbnails } from '@/components/thumbnail'
import { Link } from '@/context'
import { useFancyAnimations } from '@/hooks/useFancyAnimations'
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

type RecentlyAddedSeriesCardProps = {
	series: RecentlyAddedSeriesQuery['recentlyAddedSeries']['nodes'][number]
	cardWidth: number
}

function RecentlyAddedSeriesCard({ series, cardWidth }: RecentlyAddedSeriesCardProps) {
	const { shouldFancyHover } = useFancyAnimations()

	const thumbnailData = [series.thumbnail, ...series.media.map((m) => m.thumbnail)]

	return (
		<Link
			to={`/series/${series.id}`}
			className={cn(
				'group relative block shrink-0 transition-opacity',
				!shouldFancyHover && 'hover:opacity-80',
			)}
			style={{ width: cardWidth }}
		>
			<SeriesStackedThumbnails width={cardWidth} thumbnailData={thumbnailData} />

			<div className="left-0 top-0 px-2.5 py-3 absolute z-20 w-full">
				<Text
					className="text-xl font-bold leading-tight text-white line-clamp-2 text-wrap!"
					style={{
						textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{series.resolvedName}
				</Text>
				<Text
					className="mt-0.5 text-sm font-medium leading-tight line-clamp-1 text-gray-200"
					style={{
						textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{formatDistanceToNow(new Date(series.createdAt), { addSuffix: true })}
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
		<div className="space-x-3 rounded-lg px-4 py-4 flex items-start justify-start border border-dashed border-edge-subtle">
			<span className="rounded-lg p-2 border border-edge bg-background-surface">
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
