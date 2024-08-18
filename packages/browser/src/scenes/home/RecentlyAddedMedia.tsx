import { useRecentlyAddedMediaQuery } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { CircleSlash2 } from 'lucide-react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'

export default function RecentlyAddedMedia() {
	const { t } = useLocaleContext()
	const { data, media, isLoading, fetchNextPage, hasNextPage } = useRecentlyAddedMediaQuery({
		limit: 20,
	})

	if (isLoading || !data) {
		return null
	}

	const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	return (
		<HorizontalCardList
			title={t('homeScene.recentlyAddedBooks.title')}
			cards={cards}
			fetchNext={fetchNextPage}
			hasMore={hasNextPage}
			emptyMessage={() =>
				isLoading ? null : (
					<div className="flex min-h-[150px] flex-col items-start justify-center gap-2">
						<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
						<Heading size="sm">{t('homeScene.recentlyAddedBooks.emptyState.heading')}</Heading>
						<Text size="sm" variant="muted">
							{t('homeScene.recentlyAddedBooks.emptyState.message')}
						</Text>
					</div>
				)
			}
		/>
	)
}
