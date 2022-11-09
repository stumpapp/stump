import { useContinueReading } from '@stump/client';
import SlidingCardList from '../SlidingCardList';
import MediaCard from './MediaCard';

export default function ContinueReadingMedia() {
	const { data, isLoading, hasMore, fetchMore } = useContinueReading();

	if (isLoading || !data) {
		return null;
	}

	return (
		<SlidingCardList
			title="Continue Reading"
			cards={data.map((media) => (
				<MediaCard key={media.id} media={media} fixed />
			))}
			isLoadingNext={isLoading}
			hasNext={hasMore}
			onScrollEnd={fetchMore}
		/>
	);
}
