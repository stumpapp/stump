import { useInfiniteGraphQL } from '@stump/client'
import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookX } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'
import { graphql } from '@stump/graphql'

const query = graphql(`
	query RecentlyAddedMediaQuery($pagination: Pagination!) {
		recentlyAddedMedia(pagination: $pagination) {
			nodes {
				id
				resolvedName
				pages
				size
				status
				thumbnail {
					url
				}
				readProgress {
					percentageCompleted
					epubcfi
					page
				}
				readHistory {
					__typename
				}
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
					limit
				}
			}
		}
	}
`)

function RecentlyAddedMedia() {
	const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteGraphQL(
		query,
		['recentlyAddedMedia'],
		{
			pagination: { cursor: { limit: 20 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.recentlyAddedMedia.nodes)

	const { t } = useLocaleContext()

	const cards = nodes.map((node) => <MediaCard key={node.id} data={node} fullWidth={false} />)

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

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
