import { CardGrid } from '@stump/components'

import GenericEmptyState from '@/components/GenericEmptyState'

type Props = {
	isLoading: boolean
	items?: JSX.Element[]
	hasFilters?: boolean
	onSelect?: (item: JSX.Element) => void
}
// TODO: translate
export default function BookGrid({ items, isLoading, hasFilters, onSelect }: Props) {
	if (isLoading) {
		return null
	} else if (!items || !items.length) {
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

	return <CardGrid>{items}</CardGrid>
}
