import { useRecentlyAddedMediaQuery } from '@stump/client'

import HorizontalCardList from '@/components/HorizontalCardList'
import MediaCard from '@/components/media/MediaCard'

// TODO: better empty state
export default function RecentlyAddedMedia() {
	const { data, media, isLoading, fetchNextPage, hasNextPage } = useRecentlyAddedMediaQuery({
		limit: 20,
	})

	if (isLoading || !data) {
		return null
	}

	const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	return (
		<HorizontalCardList
			title="Recently Added Books"
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
		/>
	)
}
