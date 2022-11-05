import { useRecentlyAddedMedia } from '@stump/client';
import SlidingCardList from '../SlidingCardList';
import MediaCard from './MediaCard';

export default function RecentlyAddedMedia() {
	const { media, isLoading, hasMore, nextPage } = useRecentlyAddedMedia();

	if (isLoading || !media?.data.length) {
		return null;
	}

	function handleScrollEnd() {
		if (hasMore()) {
			nextPage();
		}
	}

	return (
		<SlidingCardList
			title="Recently Added Media"
			onScrollEnd={handleScrollEnd}
			isLoadingNext={isLoading}
		>
			{media.data.map((media) => (
				<MediaCard key={media.id} media={media} />
			))}
		</SlidingCardList>
	);
}
