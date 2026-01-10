import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { BookMarked } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import BookCard from '@/components/book/BookCard'
import HorizontalCardList_ from '@/components/HorizontalCardList'

const query = graphql(`
	query ContinueReadingMediaQuery($pagination: Pagination!) {
		keepReading(pagination: $pagination) {
			nodes {
				id
				...BookCard
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
					limit
				}
				... on OffsetPaginationInfo {
					currentPage
					totalPages
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

export const usePrefetchContinueReading = () => {
	const { sdk } = useSDK()
	const client = useQueryClient()
	return useCallback(() => {
		client.prefetchInfiniteQuery({
			queryKey: sdk.cacheKey('inProgress'),
			initialPageParam: {
				offset: {
					pageSize: 20,
					page: 1,
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

export default function ContinueReadingMediaContainer() {
	return (
		<Suspense>
			<ContinueReadingMedia />
		</Suspense>
	)
}

function ContinueReadingMedia() {
	const { sdk } = useSDK()
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteSuspenseGraphQL(
		query,
		[sdk.cacheKeys.inProgress],
		{
			pagination: { offset: { pageSize: 20, page: 1 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.keepReading.nodes)

	const { t } = useLocaleContext()

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	const cards = nodes.map((node) => <BookCard key={node.id} fragment={node} fullWidth={false} />)

	return (
		<HorizontalCardList_
			title={t('homeScene.continueReading.title')}
			items={cards}
			onFetchMore={handleFetchMore}
			emptyState={
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookMarked className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>{t('homeScene.continueReading.emptyState.heading')}</Text>
						<Text size="sm" variant="muted">
							{t('homeScene.continueReading.emptyState.message')}
						</Text>
					</div>
				</div>
			}
		/>
	)
}
