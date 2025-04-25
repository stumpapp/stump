import { useInfiniteGraphQL } from '@stump/client'
import { Text } from '@stump/components'
import { BookX } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'
import { graphql } from '@stump/graphql'

const query = graphql(`
	query BooksAfterCurrentQuery($id: ID!, $pagination: Pagination) {
		mediaById(id: $id) {
			nextInSeries(pagination: $pagination) {
				nodes {
					id
					resolvedName
					pages
					size
					status
					thumbnail {
						url
					}
					readProgress {
						percentageCompleted
						epubcfi
						page
					}
					readHistory {
						__typename
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
	}
`)

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
	const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteGraphQL(
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

	const cards = nodes.map((node) => <MediaCard data={node} key={node.id} fullWidth={false} />)

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
