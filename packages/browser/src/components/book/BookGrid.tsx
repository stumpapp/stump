import { CardGrid } from '@stump/components'
import type { Media } from '@stump/types'

import GenericEmptyState from '@/components/GenericEmptyState'

import BookCard from './BookCard'

type Props = {
	isLoading: boolean
	books?: Media[]
	hasFilters?: boolean
	onSelect?: (media: Media) => void
}
// TODO: translate
export default function BookGrid({ books, isLoading, hasFilters, onSelect }: Props) {
	if (isLoading) {
		return null
	} else if (!books || !books.length) {
		return (
			<div className="grid flex-1 place-self-center">
				<GenericEmptyState
					title={
						hasFilters
							? 'No books match your search'
							: "It doesn't look like there are any books here"
					}
					subtitle={
						hasFilters
							? 'Try removing some filters to see more books'
							: 'Do you have any books in your library?'
					}
				/>
			</div>
		)
	}

	return (
		<CardGrid>
			{books.map((m) => (
				<BookCard key={m.id} media={m} onSelect={onSelect} />
			))}
		</CardGrid>
	)
}
