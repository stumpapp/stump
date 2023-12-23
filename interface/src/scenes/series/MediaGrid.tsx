import { CardGrid } from '@stump/components'
import type { Media } from '@stump/types'

import GenericEmptyState from '@/components/GenericEmptyState'
import MediaCard from '@/components/media/MediaCard'

type Props = {
	isLoading: boolean
	media?: Media[]
	hasFilters?: boolean
	onSelect?: (media: Media) => void
}

export default function MediaGrid({ media, isLoading, hasFilters, onSelect }: Props) {
	if (isLoading) {
		return null
	} else if (!media || !media.length) {
		return (
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
		)
	}

	return (
		<CardGrid>
			{media.map((m) => (
				<MediaCard key={m.id} media={m} onSelect={onSelect} />
			))}
		</CardGrid>
	)
}
