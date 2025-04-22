import { getNextPageParam, useRecentlyAddedMediaQuery } from '@stump/client'
import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookX } from 'lucide-react'
import { Suspense, useCallback, useTransition } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'
import { graphql, PaginationInfo } from '@stump/graphql'
import { useSuspenseQuery } from '@apollo/client'

const query = graphql(`
	query RecentlyAddedMediaQuery($pagination: Pagination!) {
		recentlyAddedMedia(pagination: $pagination) {
			nodes {
				id
				...BookCard
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
	const [, startTransition] = useTransition()
	const {
		data: {
			recentlyAddedMedia: { nodes, pageInfo },
		},
		fetchMore,
	} = useSuspenseQuery(query, {
		variables: {
			pagination: { cursor: { limit: 20 } },
		},
		queryKey: ['recentlyAddedMedia'],
	})
	const { t } = useLocaleContext()

	const cards = nodes.map((media) => <MediaCard key={media.id} id={media.id} fullWidth={false} />)

	const handleFetchMore = useCallback(() => {
		const nextPageParam = getNextPageParam(pageInfo as PaginationInfo)
		if (nextPageParam) {
			startTransition(() => {
				fetchMore({
					variables: {
						pagination: nextPageParam,
					},
					updateQuery: (prev, { fetchMoreResult }) => {
						if (!fetchMoreResult) return prev
						return {
							recentlyAddedMedia: {
								...prev.recentlyAddedMedia,
								nodes: [
									...prev.recentlyAddedMedia.nodes,
									...fetchMoreResult.recentlyAddedMedia.nodes,
								],
								pageInfo: fetchMoreResult.recentlyAddedMedia.pageInfo,
							},
						}
					},
				})
			})
		}
	}, [fetchMore, pageInfo])

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
