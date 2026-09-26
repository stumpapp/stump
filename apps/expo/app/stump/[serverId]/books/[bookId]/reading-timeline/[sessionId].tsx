import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

import { fakeData } from '~/components/readingTimeline/fakeData'
import { Text } from '~/components/ui'

// const query = graphql(`
// 	query BookReadingTimelineScreen($bookId: ID!) {
// 		mediaById(id: $bookId) {
// 			id
// 			...BookReadingTimeline
// 		}
// 	}
// `)

export default function Screen() {
	const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
	// const {
	// 	data: { mediaById },
	// } = useSuspenseGraphQL(query, ['mediaById', bookId, 'readingTimeline'], { bookId })
	const sessionById = fakeData.readthroughs
		.find((readthrough) =>
			readthrough.sessions.some((session) => session.session.id === Number(sessionId)),
		)
		?.sessions.find((session) => session.session.id === Number(sessionId))
	if (!sessionById) throw new Error('oopsies make error message or do sm else, v unlikely tho')

	return (
		<View>
			<Text>TODO</Text>
		</View>
	)
}
