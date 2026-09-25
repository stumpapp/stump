import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'

import { BookReadingTimeline } from '~/components/readingTimeline'

const query = graphql(`
	query BookReadingTimelineScreen($bookId: ID!) {
		mediaById(id: $bookId) {
			id
			...BookReadingTimeline
		}
	}
`)

export default function Screen() {
	const { bookId } = useLocalSearchParams<{ bookId: string }>()
	const {
		data: { mediaById },
	} = useSuspenseGraphQL(query, ['mediaById', bookId, 'readingTimeline'], { bookId })
	if (!mediaById) throw new Error('oopsies make error message or do sm else, v unlikely tho')

	return <BookReadingTimeline fragmentRef={mediaById} />
}
