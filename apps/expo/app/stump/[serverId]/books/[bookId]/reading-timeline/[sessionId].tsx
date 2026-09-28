import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
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
			events {
				__typename
				... on Bookmark {
					id
				}
				... on MediaAnnotation {
					id
					annotationText
				}
			}
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
		}
	}
`)

export default function Screen() {
	const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
	const {
		data: { readingSessionById: session },
	} = useSuspenseGraphQL(query, ['sessionById', sessionId], { sessionId: Number(sessionId) })
	if (!session) throw new Error('oopsies make error message or do sm else, v unlikely tho')

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			{session.media != null && <ScreenBackgroundGradient item={session.media} />}

			<ScrollView
				// refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				<Text>TODO: session overview header</Text>
				<Text>standard kinda activity timeline feed view for events</Text>
				<Text>associated journal entry for session (if any)</Text>

				<Text>
					TODO: future where you met goals? and which were met? totally very hand wavy here
				</Text>
			</ScrollView>
		</SafeAreaView>
	)
}
