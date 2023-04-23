import { Heading } from '@stump/components'
import type { Media } from '@stump/types'

import ListItem from '../ListItem'

interface Props {
	isLoading: boolean
	media?: Media[]
}

export default function MediaList({ media, isLoading }: Props) {
	if (isLoading) {
		return null
	} else if (!media || !media.length) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Heading size="sm">It doesn&rsquo;t look like there are any books here.</Heading>
			</div>
		)
	}

	return (
		<div className="flex flex-1 flex-col space-y-2">
			{media.map(({ id, name, description }, i) => (
				<ListItem
					key={id}
					id={id}
					title={name}
					subtitle={description}
					href={`/book/${id}`}
					even={i % 2 === 0}
				/>
			))}
		</div>
	)
}
