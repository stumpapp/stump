import { CardGrid } from '@stump/components'
import type { Media } from '@stump/types'

import GenericEmptyState from '../../components/GenericEmptyState'
import MediaCard from '../../components/media/MediaCard'

type Props = {
	isLoading: boolean
	media?: Media[]
	hasFilters?: boolean
}

export default function MediaGrid({ media, isLoading, hasFilters }: Props) {
	if (isLoading) {
		return null
	} else if (!media || !media.length) {
		return (
			<GenericEmptyState
				title={
					hasFilters
						? 'No media matches your search'
						: "It doesn't look like there are any books here"
				}
				subtitle={
					hasFilters
						? 'Try removing some filters to see more media'
						: 'Try adding some media to your library'
				}
			/>
		)
	}

	return (
		<CardGrid>
			{media.map((m) => (
				<MediaCard key={m.id} media={m} />
			))}
		</CardGrid>
	)
}
