import { PREFETCH_STALE_TIME, queryClient, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { BookX } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import BookCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'

const query = graphql(`
	query BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {
		mediaById(id: $id) {
			nextInSeries(pagination: $pagination) {
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
				}
			}
		}
	}
`)

export const usePrefetchBooksAfterCursor = () => {
	const { sdk } = useSDK()
	return (id: string) =>
		queryClient.prefetchInfiniteQuery({
			queryKey: ['booksAfterCursor', id],
			initialPageParam: {
				id,
				pagination: {
					cursor: { limit: 20 },
				},
			},
			queryFn: async ({ pageParam }) => {
				const response = await sdk.execute(query, pageParam)
				return response
			},
			staleTime: PREFETCH_STALE_TIME,
		})
}

type Props = {
	cursor: string
}

export default function BooksAfterCurrentContainer({ cursor }: Props) {
	return (
		<Suspense>
			<BooksAfterCurrent cursor={cursor} />
		</Suspense>
	)
}

function BooksAfterCurrent({ cursor }: Props) {
	const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['booksAfterCursor', cursor],
		{
			id: cursor,
			pagination: {
				cursor: { limit: 20 },
			},
		},
	)

	const nodes = data.pages.flatMap((page) => page.mediaById?.nextInSeries.nodes || [])

	const cards = nodes.map((node) => <BookCard key={node.id} fragment={node} fullWidth={false} />)

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	return (
		<HorizontalCardList
			title="Next in series"
			items={cards}
			onFetchMore={handleFetchMore}
			emptyState={
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookX className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>Nothing to show</Text>
						<Text size="sm" variant="muted">
							No books remain after this one
						</Text>
					</div>
				</div>
			}
		/>
	)
}
