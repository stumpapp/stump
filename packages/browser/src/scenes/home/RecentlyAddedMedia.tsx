import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { BookX } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import { SimpleBookCard, useSimpleBookCardSize } from '@/components/book'
import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import { useTranslate } from '@/hooks/useTranslate'

const query = graphql(`
	query RecentlyAddedMedia($pagination: Pagination!) {
		recentlyAddedMedia(pagination: $pagination) {
			nodes {
				id
				...SimpleBookCard
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

export const usePrefetchRecentlyAddedMedia = () => {
	const { sdk } = useSDK()
	const client = useQueryClient()
	return useCallback(() => {
		return client.prefetchInfiniteQuery({
			queryKey: ['recentlyAddedMedia'],
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

function RecentlyAddedMedia() {
	const { translate } = useTranslate()
	const { cardWidth, cardHeight } = useSimpleBookCardSize()

	const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['recentlyAddedMedia'],
		{
			pagination: { cursor: { limit: 20 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.recentlyAddedMedia.nodes)

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	const emptyState = (
		<div className="space-x-3 px-4 py-4 flex items-start justify-start rounded-lg border border-dashed border-border">
			<span className="p-2 rounded-lg border border-border bg-muted">
				<BookX className="h-8 w-8 text-muted-foreground" />
			</span>
			<div>
				<Text>{translate('shared.homeSections.recentlyAddedBooks.emptyText')}</Text>
				<Text size="sm" variant="muted">
					{translate('shared.homeSections.recentlyAddedBooks.emptyMessage')}
				</Text>
			</div>
		</div>
	)

	return (
		<MultiRowHorizontalCardList
			title={translate('shared.homeSections.recentlyAddedBooks.label')}
			items={nodes}
			keyExtractor={(node) => node.id}
			renderItem={(node) => (
				<SimpleBookCard
					book={node}
					cardWidth={cardWidth}
					subtitle={(data) => formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
				/>
			)}
			cardHeight={cardHeight}
			cardWidth={cardWidth}
			onFetchMore={handleFetchMore}
			emptyState={emptyState}
		/>
	)
}

export default function RecentlyAddedMediaContainer() {
	return (
		<Suspense>
			<RecentlyAddedMedia />
		</Suspense>
	)
}
