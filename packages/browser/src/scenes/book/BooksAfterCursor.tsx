import { useApolloClient, useSuspenseQuery } from '@apollo/client'
import { getNextPageParam } from '@stump/client'
import { Text } from '@stump/components'
import { graphql, PaginationInfo } from '@stump/graphql'
import { BookX } from 'lucide-react'
import { Suspense, useCallback, useTransition } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'

const query = graphql(`
	query BooksAfterCurrentQuery($id: ID!, $pagination: CursorPagination) {
		mediaById(id: $id) {
			nextInSeries(pagination: $pagination) {
				nodes {
					id
					...BookCard
				}
				pageInfo {
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

export const usePrefetchBooksAfterCursor = (id: string) => {
	const client = useApolloClient()
	return () =>
		client.query({
			query,
			variables: {
				id,
				pagination: {
					limit: 20,
				},
			},
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
	const [, startTransition] = useTransition()
	const {
		data: { mediaById },
		fetchMore,
	} = useSuspenseQuery(query, {
		variables: {
			id: cursor,
			pagination: {
				limit: 20,
			},
		},
	})

	if (!mediaById) {
		throw new Error('Book not found')
	}

	const {
		nextInSeries: { nodes, pageInfo },
	} = mediaById

	const cards = nodes.map((node) => <MediaCard id={node.id} key={node.id} fullWidth={false} />)

	const handleFetchMore = useCallback(() => {
		const nextPageParam = getNextPageParam(pageInfo as PaginationInfo)
		if (nextPageParam) {
			startTransition(() => {
				fetchMore({
					variables: {
						id: cursor,
						pagination: nextPageParam.cursor,
					},
					updateQuery: (prev, { fetchMoreResult }) => {
						if (!fetchMoreResult) return prev
						const pageInfo = fetchMoreResult.mediaById?.nextInSeries.pageInfo
						if (!pageInfo) return prev
						return {
							mediaById: {
								...prev.mediaById,
								nextInSeries: {
									...prev.mediaById?.nextInSeries,
									nodes: [
										...(prev.mediaById?.nextInSeries.nodes || []),
										...(fetchMoreResult.mediaById?.nextInSeries.nodes || []),
									],
									pageInfo,
								},
							},
						}
					},
				})
			})
		}
	}, [])

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
