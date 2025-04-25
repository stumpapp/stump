import { useInfiniteGraphQL } from '@stump/client'
import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookMarked } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import HorizontalCardList_ from '@/components/HorizontalCardList'

import { graphql } from '@stump/graphql'
import BookCard from '@/components/book/BookCard'

const query = graphql(`
	query ContinueReadingMediaQuery($pagination: Pagination!) {
		keepReading(pagination: $pagination) {
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

export default function ContinueReadingMediaContainer() {
	return (
		<Suspense>
			<ContinueReadingMedia />
		</Suspense>
	)
}

function ContinueReadingMedia() {
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteGraphQL(
		query,
		['keepReading'],
		{
			pagination: { cursor: { limit: 20 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.keepReading.nodes)

	const { t } = useLocaleContext()

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	const cards = nodes.map((node) => <BookCard key={node.id} data={node} fullWidth={false} />)

	return (
		<HorizontalCardList_
			title={t('homeScene.continueReading.title')}
			items={cards}
			onFetchMore={handleFetchMore}
			emptyState={
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookMarked className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>{t('homeScene.continueReading.emptyState.heading')}</Text>
						<Text size="sm" variant="muted">
							{t('homeScene.continueReading.emptyState.message')}
						</Text>
					</div>
				</div>
			}
		/>
	)
}

// function ContinueReadingMedia() {
// 	const [, startTransition] = useTransition()
// 	const {
// 		data: {
// 			keepReading: { nodes, pageInfo },
// 		},
// 		fetchMore,
// 	} = useSuspenseQuery(query, {
// 		variables: {
// 			pagination: { cursor: { limit: 20 } },
// 		},
// 		queryKey: ['continueReading'],
// 	})

// 	const { t } = useLocaleContext()

// 	const handleFetchMore = useCallback(() => {
// 		const nextPageParam = getNextPageParam(pageInfo as PaginationInfo)
// 		if (nextPageParam) {
// 			startTransition(() => {
// 				fetchMore({
// 					variables: {
// 						pagination: nextPageParam,
// 					},
// 					updateQuery,
// 				})
// 			})
// 		}
// 	}, [fetchMore, pageInfo])

// 	const cards = nodes.map((node) => <BookCard key={node.id} id={node.id} fullWidth={false} />)

// 	return (
// 		<HorizontalCardList_
// 			title={t('homeScene.continueReading.title')}
// 			items={cards}
// 			onFetchMore={handleFetchMore}
// 			emptyState={
// 				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
// 					<span className="rounded-lg border border-edge bg-background-surface p-2">
// 						<BookMarked className="h-8 w-8 text-foreground-muted" />
// 					</span>
// 					<div>
// 						<Text>{t('homeScene.continueReading.emptyState.heading')}</Text>
// 						<Text size="sm" variant="muted">
// 							{t('homeScene.continueReading.emptyState.message')}
// 						</Text>
// 					</div>
// 				</div>
// 			}
// 		/>
// 	)
// }
