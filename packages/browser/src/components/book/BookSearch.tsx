import { useInfiniteGraphQL } from '@stump/client'
import { Input } from '@stump/components'
import { BookCardFragment, graphql } from '@stump/graphql'
import { useState } from 'react'
import { useDebouncedValue } from 'rooks'

import { VirtualizedCardGrid } from '../container/DynamicCardGrid'
import Spinner from '../Spinner'
import BookCard from './BookCard'

type Props = {
	onBookSelect?: (book: BookCardFragment) => void
}

// TODO(bookclub): Refactor this component

const query = graphql(`
	query BookSearchOverlay($pagination: Pagination, $filter: MediaFilterInput!) {
		media(pagination: $pagination, filter: $filter) {
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
`)

/**
 *  A component that renders a paginated grid of books with a search bar and (optionally)
 *  a filter slide over. Must be used within a `FilterProvider`.
 */
export default function BookSearch({ onBookSelect }: Props) {
	const [search, setSearch] = useState('')
	const [debouncedValue] = useDebouncedValue(search, 500)

	const { data, isLoading, fetchNextPage } = useInfiniteGraphQL(
		query,
		['bookOverlay', debouncedValue],
		{
			filter: {
				_or: [
					{
						name: {
							like: `%${debouncedValue}%`,
						},
						metadata: {
							title: {
								like: `%${debouncedValue}%`,
							},
						},
					},
				],
			},
		},
		{
			enabled: !!debouncedValue,
		},
	)

	const books = data?.pages.flatMap((page) => page.media.nodes) || []

	return (
		<div className="flex flex-1 flex-col gap-y-4">
			<Input
				placeholder="Search for a book..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			{isLoading && (
				<div className="flex flex-1 items-center justify-center">
					<Spinner />
				</div>
			)}

			<VirtualizedCardGrid
				count={books.length}
				renderItem={(index) => (
					<BookCard
						key={books[index]!.id}
						fragment={books[index]!}
						onSelect={() => onBookSelect?.(books[index]! as BookCardFragment)}
					/>
				)}
				onEndReached={fetchNextPage}
			/>
		</div>
	)
}
