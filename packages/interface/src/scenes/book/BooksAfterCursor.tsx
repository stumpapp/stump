import { useMediaAfterCursorQuery, useMediaCursor } from '@stump/client'
import { Media } from '@stump/types'

import MediaCard from '../../components/media/MediaCard'
import SlidingCardList from '../../components/SlidingCardList'
import HorizontalScrollList from '../../components/SlidingCardListNew'

type Props = {
	cursor: Media
}
export default function BooksAfterCurrent({ cursor }: Props) {
	// FIXME: this query just gets everything lol no good
	// const { media: data, isLoading, hasMore, fetchMore } = useMediaCursor(cursor.id, cursor.series_id)
	// if (isLoading || !data) {
	// 	return null
	// }

	const { media, fetchNextPage } = useMediaAfterCursorQuery(cursor.id, 20, {
		filters: {
			series_id: cursor.series_id,
		},
	})

	// console.log(media)

	// const flatData = data ? data.pages.flat() : []

	const title = cursor.series ? `Next in ${cursor.series.name}` : 'Next in Series'

	return <HorizontalScrollList items={media} fetchNext={fetchNextPage} />

	// return (
	// 	<SlidingCardList
	// 		title={title}
	// cards={data.map((media) => (
	// 	<MediaCard key={media.id} media={media} fixed />
	// ))}
	// 		isLoadingNext={isLoading}
	// 		hasNext={hasMore}
	// 		onScrollEnd={fetchMore}
	// 	/>
	// )
}
