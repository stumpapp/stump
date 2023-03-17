import { useMediaCursor } from '@stump/client'
import { Media } from '@stump/types'

import SlidingCardList from '../SlidingCardList'
import MediaCard from './MediaCard'

type Props = {
	media: Media
}
export default function BooksAfter({ media }: Props) {
	const { media: data, isLoading, hasMore, fetchMore } = useMediaCursor(media.id, media.series_id)
	if (isLoading || !data) {
		return null
	}

	return (
		<SlidingCardList
			title="Next in Series"
			cards={data.map((media) => (
				<MediaCard key={media.id} media={media} fixed />
			))}
			isLoadingNext={isLoading}
			hasNext={hasMore}
			onScrollEnd={fetchMore}
		/>
	)
}
