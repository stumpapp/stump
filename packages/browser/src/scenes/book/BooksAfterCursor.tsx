import { useMediaCursorQuery } from '@stump/client'
import { Media } from '@stump/sdk'
import { useEffect } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'

type Props = {
	cursor: Media
}

export default function BooksAfterCurrent({ cursor }: Props) {
	const { media, fetchNextPage, hasNextPage, remove } = useMediaCursorQuery({
		initialCursor: cursor.id,
		limit: 20,
		params: {
			series: {
				id: cursor.series_id,
			},
		},
	})

	const title = cursor.series ? `Next in ${cursor.series.name}` : 'Next in Series'
	const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	useEffect(() => {
		// NOTE: I'm honestly not sure why this is even required... Without this, no matter WHAT I do,
		// previous data seems to stick around. Manually removing from the cache on unmount seems to
		// fix it...
		return () => {
			remove()
		}
	}, [])

	return (
		<HorizontalCardList
			title={title}
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
		/>
	)
}
