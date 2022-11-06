import { useRecentlyAddedMedia } from '@stump/client';
import SlidingCardList from '../SlidingCardList';
import MediaCard from './MediaCard';

export default function RecentlyAddedMedia() {
	const { data, isLoading } = useRecentlyAddedMedia();

	if (isLoading || !data) {
		return null;
	}

	return (
		<SlidingCardList title="Recently Added Media" isLoadingNext={isLoading}>
			{data.map((media) => (
				<MediaCard key={media.id} media={media} />
			))}
		</SlidingCardList>
	);
}
