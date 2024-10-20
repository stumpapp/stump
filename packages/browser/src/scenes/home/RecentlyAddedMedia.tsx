import { useRecentlyAddedMediaQuery } from '@stump/client'
import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookX } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'

function RecentlyAddedMedia() {
	const { t } = useLocaleContext()
	const { media, fetchNextPage, hasNextPage, isFetching } = useRecentlyAddedMediaQuery({
		limit: 20,
		suspense: true,
	})

	const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	const handleFetchMore = useCallback(() => {
		if (!hasNextPage || isFetching) {
			return
		} else {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetching])

	return (
		<HorizontalCardList
			title={t('homeScene.recentlyAddedBooks.title')}
			items={cards}
			onFetchMore={handleFetchMore}
			emptyState={
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookX className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>{t('homeScene.recentlyAddedBooks.emptyState.heading')}</Text>
						<Text size="sm" variant="muted">
							{t('homeScene.recentlyAddedBooks.emptyState.message')}
						</Text>
					</div>
				</div>
			}
		/>
	)
}

export default function RecentlyAddedMediaContainer() {
	return (
		<Suspense>
			<RecentlyAddedMedia />
		</Suspense>
	)
}
