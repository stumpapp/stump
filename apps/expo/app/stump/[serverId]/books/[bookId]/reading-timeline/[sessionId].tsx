import { useGraphQL, useRefetch } from '@stump/client'
import { graphql } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
	EventTimeline,
	ReadingSessionDetailHeader,
} from '~/components/readingTimeline/sessionDetail'
import RefreshControl from '~/components/RefreshControl'
import { useSessionDetailOrderStore } from '~/stores/readingTimeline'

const query = graphql(`
	query BookReadingTimelineSessionIdScreen($sessionId: Int!, $eventOrder: OrderDirection) {
		readingSessionById(id: $sessionId) {
			id
			createdAt
			updatedAt
			startPage
			endPage
			endLocator {
				locations {
					position
				}
			}
			endPercentage
			elapsedSeconds
			...EventTimeline
			media {
				resolvedName
				pages
				thumbnail {
					url
					metadata {
						averageColor
						colors {
							color
							percentage
						}
						thumbhash
					}
				}
			}
			...ReadingSessionDetailHeader
		}
	}
`)

// TODO(reading-journal): render the corresponding entry for session, will need to sort out
// interaction design (e.g., is editing it tied to the route header? on press? is it inline here? sheet? etc)
// TODO(goals): a future where stump has reading goals and we can show which were met here. i am not inclined
// to show goals not met, don't want it to be seen as demotivating
export default function Screen() {
	const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
	const eventOrder = useSessionDetailOrderStore((state) => state.order)
	const { data, isLoading, refetch } = useGraphQL(
		query,
		['sessionById', sessionId, eventOrder],
		{
			sessionId: Number(sessionId),
			eventOrder: eventOrder,
		},
		{ placeholderData: keepPreviousData },
	)
	const session = data?.readingSessionById

	if (!session && !isLoading) throw new Error('Session not found')

	const [isRefetching, onRefresh] = useRefetch(refetch)

	if (!session) return null

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<ScrollView
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="px-4 gap-6">
					<ReadingSessionDetailHeader fragmentRef={session} />
					<EventTimeline fragmentRef={session} />
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
