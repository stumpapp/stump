import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Fragment, memo, useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'

import { BookListItem } from '~/components/book'
import { BookListItemFragmentType } from '~/components/book/BookListItem'
import { Heading, Text } from '~/components/ui'
import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../context'
import ReadingNow from './ReadingNow'

const query = graphql(`
	query ContinueReading($pagination: Pagination) {
		keepReading(pagination: $pagination) {
			nodes {
				id
				...BookListItem
				...ReadingNow
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					totalPages
					currentPage
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

function ContinueReading() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['continueReading', serverID],
		{
			pagination: { offset: { pageSize: 20, page: 1 } },
		},
	)
	const nodes = useMemo(() => data?.pages.flatMap((page) => page.keepReading.nodes) || [], [data])

	const [activeBook] = useState(() => data?.pages.at(0)?.keepReading.nodes.at(0))

	const leftOffBooks = useMemo(
		() => nodes.filter(({ id }) => id !== activeBook?.id),
		[nodes, activeBook],
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const { width, gap } = useListItemSize()

	const renderItem = useCallback(
		({ item }: { item: BookListItemFragmentType }) => <BookListItem book={item} />,
		[],
	)

	return (
		<Fragment>
			{activeBook && <ReadingNow book={activeBook} />}

			<View className="flex gap-4">
				<Heading size="lg">Continue Reading</Heading>

				<FlashList
					data={leftOffBooks}
					keyExtractor={({ id }) => id}
					renderItem={renderItem}
					horizontal
					estimatedItemSize={width + gap}
					onEndReached={onEndReached}
					onEndReachedThreshold={0.85}
					showsHorizontalScrollIndicator={false}
					ListEmptyComponent={<Text className="text-foreground-muted">No books in progress</Text>}
				/>
			</View>
		</Fragment>
	)
}

export default memo(ContinueReading)
