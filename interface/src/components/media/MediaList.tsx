import type { Media } from '@stump/types'

import GenericEmptyState from '../GenericEmptyState'
import ListItem from '../ListItem'

type Props = {
	isLoading: boolean
	media?: Media[]
	hasFilters?: boolean
}

export default function MediaList({ media, isLoading, hasFilters }: Props) {
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
		<div className="flex flex-1 flex-col space-y-2">
			{media.map(({ id, name, metadata }, i) => (
				<ListItem
					key={id}
					id={id}
					title={name}
					subtitle={metadata?.summary}
					href={`/book/${id}`}
					even={i % 2 === 0}
				/>
			))}
		</div>
	)
}
