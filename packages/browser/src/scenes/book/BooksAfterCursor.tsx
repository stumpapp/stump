import { useMediaCursorQuery } from '@stump/client'
import { Text } from '@stump/components'
import { Media } from '@stump/sdk'
import { BookX } from 'lucide-react'
import { useCallback, useEffect } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'

type Props = {
	cursor: Media
}

function BooksAfterCurrent({ cursor }: Props) {
	const { media, fetchNextPage, hasNextPage, remove, isFetching } = useMediaCursorQuery({
		initialCursor: cursor.id,
		limit: 20,
		params: {
			series: {
				id: cursor.series_id,
			},
		},
		suspense: true,
		useErrorBoundary: false,
	})

	const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	useEffect(() => {
		// NOTE: I'm honestly not sure why this is even required... Without this, no matter WHAT I do,
		// previous data seems to stick around. Manually removing from the cache on unmount seems to
		// fix it...
		return () => {
			remove()
		}
	}, [remove])

	const handleFetchMore = useCallback(() => {
		if (!hasNextPage || isFetching) {
			return
		} else {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetching])

	return (
		<HorizontalCardList
			title="Up next"
			items={cards}
			onFetchMore={handleFetchMore}
			emptyState={
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookX className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>Nothing to show</Text>
						<Text size="sm" variant="muted">
							No books remain after this one
						</Text>
					</div>
				</div>
			}
		/>
	)
}

export default function BooksAfterCurrentContainer({ cursor }: Props) {
	return <BooksAfterCurrent cursor={cursor} />
}
