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

// TODO: support order/group by for timeline:
// - order asc/desc
// - group by day/month
export default function Screen() {
	const { t } = useTranslate()
	const { bookId } = useLocalSearchParams<{ bookId: string }>()
	const {
		data: { mediaById },
	} = useSuspenseGraphQL(query, ['mediaById', bookId, 'readingTimeline'], { bookId })
	// TODO: some custom error that allows me to throw with custom title/message
	if (!mediaById) throw new Error(t('errors.bookNotFound.label'))

	return <BookReadingTimeline fragmentRef={mediaById} />
}
