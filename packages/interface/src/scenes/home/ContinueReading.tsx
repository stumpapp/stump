import { useContinueReading } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { CircleSlash2 } from 'lucide-react'

import HorizontalCardList from '@/components/HorizontalCardList'
import MediaCard from '@/components/media/MediaCard'

export default function ContinueReadingMedia() {
	const { media, fetchNextPage, hasNextPage, isLoading } = useContinueReading({
		limit: 20,
	})

	const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	return (
		<HorizontalCardList
			title="Continue Reading"
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
			emptyMessage={() =>
				isLoading ? null : (
					<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
						<CircleSlash2 className="h-10 w-10 pb-2 pt-1 dark:text-gray-400" />
						<Heading size="sm">You don&apos;t have anything in progress</Heading>
						<Text size="sm" variant="muted">
							Any books you&apos;re currently reading will show up here
						</Text>
					</div>
				)
			}
		/>
	)
}
