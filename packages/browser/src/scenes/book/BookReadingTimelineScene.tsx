import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { useBookOverview } from '@/components/book'
import { BookHeader } from '@/components/book/BookHeader'
import UnderConstruction from '@/components/unimplemented/UnderConstruction'

// TODO(reading-timeline): build out some kind of page for this, will prob wind up being entirely different for
// web because such a different screen size to optimize for, and have no clue
// how i want it yet tbh. i think the global reading timeline i have ideas for, like the timeline
// could be a side widget or something with stats centered? but for book-specific, generally way
// less data to work with so really the timeline itself is like kinda the entire thing

export default function BookReadingTimelineScene() {
	const { id } = useParams()
	const {
		data: { mediaById: media },
	} = useBookOverview(id || '')

	if (!media) {
		throw new Error('Book not found')
	}

	return (
		<>
			<Helmet>
				<title>Stump | {media.resolvedName}</title>
			</Helmet>

			<BookHeader fragment={media} />

			<UnderConstruction />
		</>
	)
}
