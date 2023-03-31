import { getMediaThumbnail } from '@stump/api'
import { useMediaAfterCursorQuery } from '@stump/client'
import { EntityCard } from '@stump/components'
import { Media } from '@stump/types'

import HorizontalCardList from '../../components/HorizontalCardList'

type Props = {
	cursor: Media
}
export default function BooksAfterCurrent({ cursor }: Props) {
	const { media, fetchNextPage, hasNextPage } = useMediaAfterCursorQuery(cursor.id, 20, {
		filters: {
			series_id: cursor.series_id,
		},
	})

	const title = cursor.series ? `Next in ${cursor.series.name}` : 'Next in Series'

	const cards = media.map((media) => (
		<EntityCard
			key={media.id}
			title={media.name}
			href={`/books/${media.id}`}
			imageUrl={getMediaThumbnail(media.id)}
			fullWidth={false}
		/>
	))

	return (
		<HorizontalCardList
			title={title}
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
		/>
	)
}
