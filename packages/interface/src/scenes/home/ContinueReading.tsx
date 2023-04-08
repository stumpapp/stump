import { useContinueReading } from '@stump/client'

import HorizontalCardList from '../../components/HorizontalCardList'
import MediaCard from '../../components/media/MediaCard'

export default function ContinueReadingMedia() {
	const { media, fetchNextPage, hasNextPage } = useContinueReading({
		limit: 20,
	})

	const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	return (
		<HorizontalCardList
			title="Continue Reading"
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
		/>
	)
}
