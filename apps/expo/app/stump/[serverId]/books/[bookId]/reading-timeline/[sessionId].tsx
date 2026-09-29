import { useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import {
	EventTimeline,
	ReadingSessionDetailHeader,
} from '~/components/readingTimeline/sessionDetail'
import RefreshControl from '~/components/RefreshControl'
import { Text } from '~/components/ui'

// TODO: prolly compose in fragments? awk bc book timeline uses
// technically a diff object type
const query = graphql(`
	query BookReadingTimelineSessionIdScreen($sessionId: Int!) {
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

export default function Screen() {
	const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
	const {
		data: { readingSessionById: session },
		refetch,
	} = useSuspenseGraphQL(query, ['sessionById', sessionId], { sessionId: Number(sessionId) })
	if (!session) throw new Error('oopsies make error message or do sm else, v unlikely tho')

	const [isRefetching, onRefresh] = useRefetch(refetch)

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

					<Text>associated journal entry for session (if any)</Text>

					<Text>
						TODO: future where you met goals? and which were met? totally very hand wavy here
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
