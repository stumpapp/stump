import { useGraphQL, useRefetch } from '@stump/client'
import { graphql } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
	EventTimeline,
	ReadingSessionDetailHeader,
	SessionJournal,
	useReadingSessionMenu,
} from '~/components/readingTimeline/sessionDetail'
import RefreshControl from '~/components/RefreshControl'
import { useSessionDetailOrderStore } from '~/stores/readingTimeline'

const query = graphql(`
	query BookReadingTimelineSessionIdScreen($sessionId: Int!, $eventOrder: OrderDirection) {
		readingSessionById(id: $sessionId) {
			id
			...ReadingSessionMenu
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
			...SessionJournal
		}
	}
`)

// TODO(goals): a future where stump has reading goals and we can show which were met here. i am not inclined
// to show goals not met, don't want it to be seen as demotivating
export default function Screen() {
	const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
	const eventOrder = useSessionDetailOrderStore((state) => state.order)
	const { data, isLoading, refetch, error } = useGraphQL(
		query,
		['sessionById', sessionId, eventOrder],
		{
			sessionId: Number(sessionId),
			eventOrder: eventOrder,
		},
		{ placeholderData: keepPreviousData },
	)
	const session = data?.readingSessionById
	const sessionMenu = useReadingSessionMenu(session)

	if (error) throw new Error(`Error fetching session: ${error.message}`)
	if (!session && !isLoading) throw new Error('Session not found')

	const [isRefetching, onRefresh] = useRefetch(refetch)

	if (!session) return null

	// FIXME: the keyboard aware not quite right, it works up to a point then stops
	// could just be the sim too
	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			{sessionMenu}
			<KeyboardAwareScrollView
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="px-4 gap-6">
					<ReadingSessionDetailHeader fragmentRef={session} />
					<EventTimeline fragmentRef={session} />
					<SessionJournal fragmentRef={session} />
				</View>
			</KeyboardAwareScrollView>
		</SafeAreaView>
	)
}
