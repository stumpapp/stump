import { useRecentlyAddedMedia } from '@stump/client';
import SlidingCardList from '../SlidingCardList';
import MediaCard from './MediaCard';

export default function RecentlyAddedMedia() {
	const { data, isLoading, hasMore, fetchMore } = useRecentlyAddedMedia();

	if (isLoading || !data) {
		return null;
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
	);
}
