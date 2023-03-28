import { useMediaCursor } from '@stump/client'
import { Media } from '@stump/types'

import MediaCard from '../../components/media/MediaCard'
import SlidingCardList from '../../components/SlidingCardList'

type Props = {
	cursor: Media
}
export default function BooksAfterCurrent({ cursor }: Props) {
	const { media: data, isLoading, hasMore, fetchMore } = useMediaCursor(cursor.id, cursor.series_id)
	if (isLoading || !data) {
		return null
	}

	const title = cursor.series ? `Next in ${cursor.series.name}` : 'Next in Series'

	return (
		<SlidingCardList
			title={title}
			cards={data.map((media) => (
				<MediaCard key={media.id} media={media} fixed />
			))}
			isLoadingNext={isLoading}
			hasNext={hasMore}
			onScrollEnd={fetchMore}
		/>
	)
}
