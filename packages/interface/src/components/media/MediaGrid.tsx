import { Heading } from '@chakra-ui/react'
import type { Media } from '@stump/client'

import { CardGrid } from '../Card'
import MediaCard from './MediaCard'

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
				{/* TODO: If I take in pageData, I can determine if it is an out of bounds issue or if the series truly has
				no media. */}
				<Heading size="sm">It doesn&rsquo;t look like there is any media here.</Heading>
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
