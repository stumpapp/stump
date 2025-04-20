import { useContinueReading, usePaginationFragment } from '@stump/client'
import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookMarked } from 'lucide-react'
import { Suspense, useCallback, useEffect } from 'react'

import { graphql } from 'relay-runtime'
import {
	PreloadedQuery,
	usePreloadedQuery,
	useQueryLoader,
	usePaginationFragment as useRelayPaginationFragment,
} from 'react-relay'
import { ContinueReadingMediaQuery } from './__generated__/ContinueReadingMediaQuery.graphql'
import { ContinueReadingMediaFragment$key } from './__generated__/ContinueReadingMediaFragment.graphql'
import HorizontalCardList_ from '@/components/HorizontalCardList'
import { gql, useSuspenseQuery } from '@apollo/client'

// const fragment = graphql`
// 	fragment ContinueReadingMediaFragment on Query
// 	@refetchable(queryName: "ContinueReadingMediaRefetchQuery")
// 	@argumentDefinitions(pagination: { type: "Pagination", defaultValue: { offset: { page: 1 } } }) {
// 		media(pagination: $pagination) {
// 			nodes {
// 				id
// 			}
// 			pageInfo {
// 				__typename
// 				... on CursorPaginationInfo {
// 					currentCursor
// 					nextCursor
// 				}
// 			}
// 		}
// 	}
// `

// const query = graphql`
// 	query ContinueReadingMediaQuery($pagination: Pagination!) {
// 		...ContinueReadingMediaFragment @arguments(pagination: $pagination)
// 	}
// `

const query = gql`
	query ContinueReadingMediaQuery($pagination: Pagination!) {
		media(pagination: $pagination) {
			nodes {
				id
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
				}
			}
		}
	}
`

export default function ContinueReadingMediaContainer() {
	// const [queryRef, loadQuery] = useQueryLoader<ContinueReadingMediaQuery>(query)
	// useEffect(() => {
	// 	loadQuery({
	// 		pagination: {
	// 			offset: {
	// 				page: 1,
	// 			},
	// 		},
	// 	})
	// }, [loadQuery])
	// if (!queryRef) {
	// 	return null
	// }
	// return (
	// 	<Suspense>
	// 		<ContinueReadingMedia queryRef={queryRef} />
	// 	</Suspense>
	// )

	return (
		<Suspense>
			<ContinueReadingMedia />
		</Suspense>
	)
}

type Props = {
	// queryRef: PreloadedQuery<ContinueReadingMediaQuery>
}

function ContinueReadingMedia() {
	const {
		data: {
			media: { nodes: books, pageInfo },
		},
		fetchMore,
	} = useSuspenseQuery(query, {
		variables: {
			pagination: { cursor: { limit: 20 } },
		},
	})

	// const node = usePreloadedQuery(query, queryRef)
	// // const node = useLazyLoadQuery<ContinueReadingMediaQuery>(query, {
	// // 	pagination: { offset: { page: 1 } },
	// // })
	// // const [data, refetch] = useRefetchableFragment(fragment, node)
	// const {
	// 	data: {
	// 		media: { nodes: books },
	// 	},
	// 	hasNext,
	// 	loadNext,
	// } = usePaginationFragment<ContinueReadingMediaQuery, ContinueReadingMediaFragment$key>(
	// 	fragment,
	// 	node,
	// )
	// // const { data:, hasNext, loadNext } = useRelayPaginationFragment<
	// // 	ContinueReadingMediaQuery,
	// // 	ContinueReadingMediaFragment$key
	// // >(fragment, node)
	const { t } = useLocaleContext()
	// console.log({ hasNext })
	// // const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)
	// // const handleFetchMore = useCallback(() => {
	// // 	if (!hasNextPage || isFetching) {
	// // 		return
	// // 	} else {
	// // 		fetchNextPage()
	// // 	}
	// // }, [fetchNextPage, hasNextPage, isFetching])
	const handleFetchMore = useCallback(() => {
		// if (!hasNext) {
		// 	return
		// } else {
		// 	console.log('loading next page')
		// 	loadNext()
		// }
		fetchMore({
			variables: {
				pagination: {
					cursor: {
						limit: 20,
						after: pageInfo.nextCursor,
					},
				},
			},
		})
	}, [])

	return (
		<HorizontalCardList_
			title={t('homeScene.continueReading.title')}
			// items={cards}
			items={books.map((book) => (
				<div>{book.id}</div>
			))}
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
