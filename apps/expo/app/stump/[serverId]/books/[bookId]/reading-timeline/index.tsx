import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'

import { BookReadingTimeline } from '~/components/readingTimeline'
import { useTranslate } from '~/lib/hooks'

const query = graphql(`
	query BookReadingTimelineScreen($bookId: ID!) {
		mediaById(id: $bookId) {
			id
			...BookReadingTimeline
		}
	}
`)

// TODO(reading-timeline): support order/group by:
// - order asc/desc
// - group by day/month
export default function Screen() {
	const { translate } = useTranslate()
	const { bookId } = useLocalSearchParams<{ bookId: string }>()
	const {
		data: { mediaById },
		refetch,
	} = useSuspenseGraphQL(query, ['mediaById', bookId, 'readingTimeline'], { bookId })
	// TODO(errors): some custom error that allows me to throw with custom title/message
	if (!mediaById) throw new Error(translate('shared.errors.bookNotFound.title'))

	return <BookReadingTimeline fragmentRef={mediaById} refetch={refetch} />
}
