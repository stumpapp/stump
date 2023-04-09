import { CardGrid, Heading } from '@stump/components'
import type { Media } from '@stump/types'

import MediaCard from '../../components/media/MediaCard'

interface Props {
	isLoading: boolean
	media?: Media[]
}

export default function MediaGrid({ media, isLoading }: Props) {
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
		<CardGrid>
			{media.map((m) => (
				<MediaCard key={m.id} media={m} />
			))}
		</CardGrid>
	)
}
