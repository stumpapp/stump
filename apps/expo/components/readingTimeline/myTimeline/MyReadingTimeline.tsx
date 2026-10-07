import { FlashList } from '@shopify/flash-list'
import { useInfiniteCursorGraphQL, useRefetch } from '@stump/client'
import { graphql, MyReadingTimelineScreenQuery } from '@stump/graphql'
import { intlFormat, parse } from 'date-fns'
import { View } from 'react-native'

import { useReadingTimelineDisplayStore } from '~/stores/readingTimeline'

import { OwlEmptyState } from '../../OwlEmptyState'
import RefreshControl from '../../RefreshControl'
import { Text } from '../../ui'
import { ReadingSessionCard } from '../ReadingSessionCard'
import { MyReadingTimelineMenu } from './MyReadingTimelineMenu'

const query = graphql(`
	query MyReadingTimelineScreen($pagination: CursorPagination, $order: OrderDirection) {
		myReadingTimeline(pagination: $pagination, order: $order) {
			nodes {
				mediaId
				session {
					session {
						sessionDate
					}
					...ReadingSessionCard
					...ReadingSessionCardMedia
				}
			}
		}
	}
`)

type ListItem =
	| {
			type: 'dateHeader'
			sessionDate: string
	  }
	| {
			type: 'dateSpacer'
	  }
	| {
			type: 'session'
			node: MyReadingTimelineScreenQuery['myReadingTimeline']['nodes'][number]
	  }

export function MyReadingTimeline() {
	const order = useReadingTimelineDisplayStore((state) => state.order)
	const { data, refetch, hasNextPage, fetchNextPage } = useInfiniteCursorGraphQL(
		query,
		['myReadingTimeline', order],
		{
			pagination: { limit: 100 },
			order,
		},
	)
	const readingTimeline = data?.pages.flatMap((page) => page.myReadingTimeline.nodes)
	const groupBy = useReadingTimelineDisplayStore((state) => state.groupBy)

	const [isRefetching, onRefresh] = useRefetch(refetch)

	if (!readingTimeline) return <OwlEmptyState title="Todo" />

	const renderItem = ({ item }: { item: ListItem }) => {
		if (item.type === 'dateHeader') {
			return <Text className="text-2xl font-semibold tracking-wide py-2">{item.sessionDate}</Text>
		} else if (item.type === 'dateSpacer') {
			// matches the gap-10 on BookReadingTimeline but is a bit janky of a workaround
			return <View className="h-10" />
		} else if (item.type === 'session') {
			return (
				<ReadingSessionCard
					fragmentRef={item.node.session}
					mediaFragmentRef={item.node.session}
					groupedBy={groupBy}
				/>
			)
		}
		return null
	}

	const groupedSessions = readingTimeline.reduce(
		(acc, node) => {
			const parsedDate = parse(node.session.session.sessionDate, 'yyyy-MM-dd', new Date())
			if (groupBy === 'month') {
				parsedDate.setDate(1) // it's fine, we won't show it so it does not matter
			}
			const isSameYear = parsedDate.getFullYear() === new Date().getFullYear()
			const date = intlFormat(parsedDate, {
				year: isSameYear ? undefined : 'numeric',
				month: groupBy === 'month' ? 'long' : 'short',
				day: groupBy === 'day' ? '2-digit' : undefined,
			})
			if (!acc[date]) {
				acc[date] = []
			}
			acc[date].push(node)
			return acc
		},
		{} as Record<string, typeof readingTimeline>,
	)

	const listItems = Object.entries(groupedSessions).flatMap(([date, nodes]) => [
		{ type: 'dateHeader', sessionDate: date },
		...(nodes.map((node) => ({ type: 'session', node })) satisfies ListItem[]),
		{ type: 'dateSpacer' },
	]) satisfies ListItem[]

	return (
		<FlashList
			refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
			data={listItems}
			// TODO: rn the card links to books/[bookId]/reading-timeline/[sessionId]
			// this might be acceptable and honestly reduce the amount of work, but atm
			// the background gradient is a bit awkward when it changes and the back nav
			// doesn't work when jumping stacks
			renderItem={renderItem}
			contentContainerStyle={{ paddingHorizontal: 16 }}
			contentInsetAdjustmentBehavior="automatic"
			ListHeaderComponent={<MyReadingTimelineMenu />}
			onEndReached={() => {
				if (hasNextPage) fetchNextPage()
			}}
			// since we are manually grouping things i want to be a little more agressive here
			onEndReachedThreshold={0.5}
		/>
	)
}
