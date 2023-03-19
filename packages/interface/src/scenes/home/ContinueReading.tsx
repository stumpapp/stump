import { useContinueReading } from '@stump/client'

import MediaCard from '../../components/media/MediaCard'
import SlidingCardList from '../../components/SlidingCardList'

// TODO: better empty state
export default function ContinueReadingMedia() {
	const { data, isLoading, hasMore, fetchMore } = useContinueReading()

	if (isLoading || !data) {
		return null
	}

	return (
		<SlidingCardList
			title="Continue Reading"
			cards={data.map((media) => (
				<MediaCard key={media.id} media={media} fixed readingLink />
			))}
			isLoadingNext={isLoading}
			hasNext={hasMore}
			onScrollEnd={fetchMore}
		/>
	)
}
