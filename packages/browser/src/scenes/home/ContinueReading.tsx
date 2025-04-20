import { useContinueReading } from '@stump/client'
import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookMarked } from 'lucide-react'
import { Suspense, useCallback, useEffect } from 'react'

import MediaCard from '@/components/book/BookCard'
import HorizontalCardList from '@/components/HorizontalCardList'
import { graphql } from 'relay-runtime'
import {
	PreloadedQuery,
	usePaginationFragment,
	usePreloadedQuery,
	useQueryLoader,
} from 'react-relay'
import { ContinueReadingMediaQuery } from './__generated__/ContinueReadingMediaQuery.graphql'

const fragment = graphql`
	fragment ContinueReadingMediaFragment on Query
	@refetchable(queryName: "ContinueReadingMediaRefetchQuery")
	@argumentDefinitions(pagination: { type: "Pagination", defaultValue: { offset: { page: 1 } } }) {
		keepReading(pagination: $pagination) {
			nodes {
				id
			}
			pageInfo {
				... on OffsetPaginationInfo {
					totalPages
				}
			}
		}
	}
`

const query = graphql`
	query ContinueReadingMediaQuery($pagination: Pagination!) {
		...ContinueReadingMediaFragment @arguments(pagination: $pagination)
	}
`

export default function ContinueReadingMediaContainer() {
	const [queryRef, loadQuery] = useQueryLoader<ContinueReadingMediaQuery>(query)

	useEffect(() => {
		loadQuery({
			pagination: {
				offset: {
					page: 1,
				},
			},
		})
	}, [loadQuery])

	if (!queryRef) {
		return null
	}

	return (
		<Suspense>
			<ContinueReadingMedia queryRef={queryRef} />
		</Suspense>
	)
}

type Props = {
	queryRef: PreloadedQuery<ContinueReadingMediaQuery>
}

function ContinueReadingMedia({ queryRef }: Props) {
	const data = usePreloadedQuery(query, queryRef)

	console.log(data)

	return null
	// const { t } = useLocaleContext()
	// const { media, fetchNextPage, hasNextPage, isFetching } = useContinueReading({
	// 	limit: 20,
	// 	suspense: true,
	// })

	// const cards = media.map((media) => <MediaCard media={media} key={media.id} fullWidth={false} />)

	// const handleFetchMore = useCallback(() => {
	// 	if (!hasNextPage || isFetching) {
	// 		return
	// 	} else {
	// 		fetchNextPage()
	// 	}
	// }, [fetchNextPage, hasNextPage, isFetching])

	// return (
	// 	<HorizontalCardList
	// 		title={t('homeScene.continueReading.title')}
	// 		items={cards}
	// 		onFetchMore={handleFetchMore}
	// 		emptyState={
	// 			<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
	// 				<span className="rounded-lg border border-edge bg-background-surface p-2">
	// 					<BookMarked className="h-8 w-8 text-foreground-muted" />
	// 				</span>
	// 				<div>
	// 					<Text>{t('homeScene.continueReading.emptyState.heading')}</Text>
	// 					<Text size="sm" variant="muted">
	// 						{t('homeScene.continueReading.emptyState.message')}
	// 					</Text>
	// 				</div>
	// 			</div>
	// 		}
	// 	/>
	// )
}
