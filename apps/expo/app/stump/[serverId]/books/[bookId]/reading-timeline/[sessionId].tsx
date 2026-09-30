import { useRefetch, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, OrderDirection } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import {
	EventTimeline,
	ReadingSessionDetailHeader,
} from '~/components/readingTimeline/sessionDetail'
import { useEventOrderStore } from '~/components/readingTimeline/sessionDetail/store'
import RefreshControl from '~/components/RefreshControl'

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
	const { sdk } = useSDK()
	const eventOrder = useEventOrderStore((state) => state.order)
	const {
		data: { readingSessionById: session },
		refetch,
	} = useSuspenseGraphQL(query, ['sessionById', sessionId, eventOrder], {
		sessionId: Number(sessionId),
		eventOrder: eventOrder,
	})
	if (!session) throw new Error('oopsies make error message or do sm else, v unlikely tho')

	const [isRefetching, onRefresh] = useRefetch(refetch)

	// TODO: don't suspend and this prefetch is largely unnecessary, i just want to avoid
	// a flash of background change when switching the order. the problem is without suspense
	// it will also do it lol so i think like i wrote in a separate todo elsewhere that
	// i somehow cannot find i just need to query for the thumbnail colors/meta higher up and
	// shove it in a provider so the suspense boundary can be the same gradient and shit
	const client = useQueryClient()
	useEffect(
		() => {
			// after mount prefetch the other ordering so that it is instant
			const otherOrder =
				eventOrder === OrderDirection.Asc ? OrderDirection.Desc : OrderDirection.Asc
			client.prefetchQuery({
				queryKey: ['sessionById', sessionId, otherOrder],
				queryFn: () =>
					sdk.execute(query, {
						sessionId: Number(sessionId),
						eventOrder: otherOrder,
					}),
			})
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			{session.media != null && <ScreenBackgroundGradient item={session.media} />}

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
