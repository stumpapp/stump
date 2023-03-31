import { getMediaThumbnail } from '@stump/api'
import { EntityCard, Heading } from '@stump/components'
import type { Media } from '@stump/types'

import { CardGrid } from '../../components/Card'

interface Props {
	isLoading: boolean
	media?: Media[]
}

export default function MediaGrid({ media, isLoading }: Props) {
	if (isLoading) {
		return <div>Loading...</div>
	} else if (!media || !media.length) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Heading size="sm">It doesn&rsquo;t look like there is any media here.</Heading>
			</div>
		)
	}

	return (
		<CardGrid>
			{media.map((m) => (
				<EntityCard
					key={m.id}
					title={m.name}
					href={`/books/${m.id}`}
					imageUrl={getMediaThumbnail(m.id)}
				/>
			))}
		</CardGrid>
	)
}
