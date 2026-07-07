import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Fragment, memo, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { HorizontalBookListItem } from '~/components/book'
import { HorizontalBookListItemFragmentType } from '~/components/book/HorizontalBookListItem'
import { Heading, Text } from '~/components/ui'
import { useListItemSize, useTranslate } from '~/lib/hooks'

import { useActiveServer } from '../context'
import ReadingNow from './ReadingNow'

const query = graphql(`
	query ContinueReading($pagination: Pagination) {
		keepReading(pagination: $pagination) {
			nodes {
				id
				...HorizontalBookListItem
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
	const { t } = useTranslate()
	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['continueReading', serverID],
		{
			pagination: { offset: { pageSize: 20, page: 1 } },
		},
	)
	const nodes = useMemo(() => data?.pages.flatMap((page) => page.keepReading.nodes) || [], [data])

	// Take the first 5 books as "currently reading"
	const activeBooks = useMemo(() => data?.pages.at(0)?.keepReading.nodes.slice(0, 5) || [], [data])

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
		({ item }: { item: HorizontalBookListItemFragmentType }) => (
			<HorizontalBookListItem book={item} />
		),
		[],
	)

	const { horizontalGap } = useListItemSize()

	return (
		<Fragment
			key={`continue-reading-section-${nodes.length ? 'at-least-one-item' : 'empty'}`} // Force re-render when switching between empty and non-empty states
		>
			{activeBooks.length > 0 && <ReadingNow books={activeBooks} />}

			{(leftOffBooks.length > 0 || activeBooks.length === 0) && (
				<View className="flex">
					<Heading size="xl" className="px-4">
						{t('stumpServer.continueReading.label')}
					</Heading>

					<FlashList
						data={leftOffBooks}
						keyExtractor={({ id }) => id}
						renderItem={renderItem}
						horizontal
						contentContainerStyle={{ padding: 16 }}
						onEndReached={onEndReached}
						onEndReachedThreshold={0.85}
						showsHorizontalScrollIndicator={false}
						ItemSeparatorComponent={() => <View style={{ width: horizontalGap }} />}
						ListEmptyComponent={
							<Text className="px-4 text-foreground-muted">
								{t('stumpServer.continueReading.emptyText')}
							</Text>
						}
					/>
				</View>
			)}
		</Fragment>
	)
}

export default memo(ContinueReading)
