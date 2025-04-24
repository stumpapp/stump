import { getNextPageParam, useMediaCursorQuery } from '@stump/client'
import { Text } from '@stump/components'
import { Media } from '@stump/sdk'
import { BookX } from 'lucide-react'
import { useCallback, useEffect, useTransition } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'
import { CursorPagination, graphql, PaginationInfo } from '@stump/graphql'
import { useSuspenseQuery } from '@apollo/client'

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

type Props = {
	cursor: string
}

export default function BooksAfterCurrentContainer({ cursor }: Props) {
	return <BooksAfterCurrent cursor={cursor} />
}

function BooksAfterCurrent({ cursor }: Props) {
	// const { media, fetchNextPage, hasNextPage, remove, isFetching } = useMediaCursorQuery({
	// 	initialCursor: cursor.id,
	// 	limit: 20,
	// 	params: {
	// 		series: {
	// 			id: cursor.series_id,
	// 		},
	// 	},
	// 	suspense: true,
	// 	useErrorBoundary: false,
	// })
	const [, startTransition] = useTransition()
	const {
		data: { mediaById },
		fetchMore,
	} = useSuspenseQuery(query, {
		variables: {
			id: cursor,
		},
	})

	if (!mediaById) {
		return null
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
						pagination: nextPageParam as CursorPagination,
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
			title="Up next"
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
