import { FlashList } from '@shopify/flash-list'
import { useRefetch, useSuspenseGraphQL } from '@stump/client'
import { type BookClubPastDiscussionsQuery, graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import groupBy from 'lodash/groupBy'
import partition from 'lodash/partition'
import { useMemo } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PastBookGridItem } from '~/components/bookClub'
import { usePastDiscussionSize } from '~/components/bookClub/usePastDiscussionSize'
import ListEmpty from '~/components/ListEmpty'
import RefreshControl from '~/components/RefreshControl'

const query = graphql(`
	query BookClubPastDiscussions($bookClubId: ID!) {
		previousBookClubDiscussions(bookClubId: $bookClubId) {
			displayName
			createdAt
			book {
				id
				...PastBookGridItem
			}
			messageCount
		}
	}
`)

type BookClubBook = BookClubPastDiscussionsQuery['previousBookClubDiscussions'][number]['book']

export default function Screen() {
	const { clubId } = useLocalSearchParams<{ clubId: string }>()

	const { data, refetch } = useSuspenseGraphQL(query, ['bookClubPastDiscussions', clubId], {
		bookClubId: clubId,
	})
	const [isRefreshing, handleRefresh] = useRefetch(refetch)

	const [nonBookDiscussions, bookDiscussions] = partition(
		data.previousBookClubDiscussions,
		(discussion) => discussion.book === null,
	)
	const discussionsByBookId = groupBy(bookDiscussions, (discussion) => discussion.book?.id)

	const resolvedBookDiscussions = useMemo(() => {
		// We will merge any discussions of the same book into a single entry of:
		// {book:{...}, messageCount: number}
		// This is REALLY awkward but past discussions will have a grouping in a dedicated page
		// that basically shows an archival view of that book
		return Object.entries(discussionsByBookId)
			.map(([, discussions]) => {
				const book = discussions[0]?.book
				const messageCount = discussions.reduce(
					(acc, discussion) => acc + discussion.messageCount,
					0,
				)
				return {
					__typename: 'DiscussionWithBook' as const,
					book,
					messageCount,
				}
			})
			.filter(
				(
					entry,
				): entry is {
					book: BookClubBook
					messageCount: number
					__typename: 'DiscussionWithBook'
				} => !!entry.book,
			)
	}, [discussionsByBookId])

	// FIXME: The sorting here will be fucked...
	const listData = useMemo(
		() => [
			...nonBookDiscussions.map((d) => ({
				__typename: 'DiscussionWithoutBook' as const,
				discussion: d,
			})),
			...resolvedBookDiscussions,
		],
		[nonBookDiscussions, resolvedBookDiscussions],
	)

	const { numColumns, paddingHorizontal } = usePastDiscussionSize()

	return (
		<SafeAreaView edges={['bottom']} className="flex-1 bg-background">
			<FlashList
				numColumns={numColumns}
				data={listData}
				keyExtractor={(item) =>
					item.__typename === 'DiscussionWithoutBook'
						? item.discussion.createdAt
						: item.book?.id || JSON.stringify(item.book)
				}
				contentInsetAdjustmentBehavior="always"
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
				contentContainerStyle={{ paddingHorizontal, paddingVertical: 16 }}
				ItemSeparatorComponent={() => <View className="h-2" />}
				ListEmptyComponent={
					<ListEmpty title="No Past Books" message="Completed books will appear here" />
				}
				// TODO: Support both archive discussions without books and with books
				renderItem={({ item }) =>
					item.__typename === 'DiscussionWithBook' && item.book ? (
						<PastBookGridItem data={item.book} messageCount={item.messageCount} />
					) : null
				}
			/>
		</SafeAreaView>
	)
}
