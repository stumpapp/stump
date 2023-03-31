import { getMediaThumbnail } from '@stump/api'
import { useRecentlyAddedMedia, useRecentlyAddedMediaQuery } from '@stump/client'
import { EntityCard } from '@stump/components'

import HorizontalCardList from '../../components/HorizontalCardList'
import MediaCard from '../../components/media/MediaCard'
import SlidingCardList from '../../components/SlidingCardList'

// TODO: better empty state
export default function RecentlyAddedMedia() {
	const { data, media, isLoading, fetchNextPage } = useRecentlyAddedMediaQuery({ limit: 20 })
	// const { data, isLoading, hasMore, fetchMore } = useRecentlyAddedMedia()

	if (isLoading || !data) {
		return null
	}

	const cards = media.map((media) => (
		<EntityCard
			key={media.id}
			title={media.name}
			href={`/books/${media.id}`}
			imageUrl={getMediaThumbnail(media.id)}
			fullWidth={false}
		/>
	))

	return <HorizontalCardList title="Recently Added Books" cards={cards} fetchNext={fetchNextPage} />
}
