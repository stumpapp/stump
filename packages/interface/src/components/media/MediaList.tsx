import type { Media } from '@stump/types'

import ListItem from '../ListItem'

interface Props {
	isLoading: boolean
	media?: Media[]
}

export default function MediaList({ media, isLoading }: Props) {
	if (isLoading) {
		return <div>Loading...</div>
	} else if (!media) {
		return <div>whoop</div>
	}

	return (
		<div className="flex flex-1 flex-col space-y-2">
			{media.map(({ id, name, description }, i) => (
				<ListItem
					key={id}
					id={id}
					title={name}
					subtitle={description}
					href={`/books/${id}`}
					even={i % 2 === 0}
				/>
			))}
		</div>
	)
}
