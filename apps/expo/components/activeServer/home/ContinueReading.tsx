import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Fragment, memo, useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'

import { BookListItem } from '~/components/book'
import { BookListItemFragmentType } from '~/components/book/BookListItem'
import { Heading, Text } from '~/components/ui'

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

	// Take the first 5 books as "currently reading"
	const [activeBooks] = useState(() => data?.pages.at(0)?.keepReading.nodes.slice(0, 5) || [])

	const leftOffBooks = useMemo(
		() => nodes.filter(({ id }) => !activeBooks.some((book) => book.id === id)),
		[nodes, activeBooks],
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const renderItem = useCallback(
		({ item }: { item: BookListItemFragmentType }) => <BookListItem book={item} />,
		[],
	)

	return (
		<Fragment>
			{activeBooks.length > 0 && <ReadingNow books={activeBooks} />}

			{(leftOffBooks.length > 0 || activeBooks.length === 0) && (
				<View className="flex gap-4">
					<Heading size="xl" className="px-4">
						Continue Reading
					</Heading>

					<FlashList
						data={leftOffBooks}
						keyExtractor={({ id }) => id}
						renderItem={renderItem}
						horizontal
						contentContainerStyle={{ paddingHorizontal: 16 }}
						onEndReached={onEndReached}
						onEndReachedThreshold={0.85}
						showsHorizontalScrollIndicator={false}
						ListEmptyComponent={
							<Text className="px-4 text-foreground-muted">No books in progress</Text>
						}
					/>
				</View>
			)}
		</Fragment>
	)
}

export default memo(ContinueReading)
