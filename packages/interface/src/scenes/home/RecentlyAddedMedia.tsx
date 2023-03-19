import { useRecentlyAddedMedia } from '@stump/client'

import MediaCard from '../../components/media/MediaCard'
import SlidingCardList from '../../components/SlidingCardList'

// TODO: better empty state
export default function RecentlyAddedMedia() {
	const { data, isLoading, hasMore, fetchMore } = useRecentlyAddedMedia()

	if (isLoading || !data) {
		return null
	}

	return (
		<SlidingCardList
			title="Recently Added Books"
			cards={data.map((media) => (
				<MediaCard key={media.id} media={media} fixed />
			))}
			isLoadingNext={isLoading}
			hasNext={hasMore}
			onScrollEnd={fetchMore}
		/>
	)
}
