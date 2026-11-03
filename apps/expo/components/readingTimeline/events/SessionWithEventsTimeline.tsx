import { FragmentType, graphql, OrderDirection, useFragment } from '@stump/graphql'
import { Book, BookOpen } from 'lucide-react-native'
import { View } from 'react-native'

import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useSessionDetailOrderStore } from '~/stores/readingTimeline'

import { EventRenderer } from './EventRenderer'
import { EventTimelineRow } from './EventTimelineRow'

const fragment = graphql(`
	fragment SessionWithEventsTimeline on SessionWithEvents {
		session {
			id
			mediaId
			createdAt
			startPage
			startLocator {
				locations {
					position
				}
			}
			updatedAt
			endPage
			endLocator {
				locations {
					position
				}
			}
		}
		events {
			__typename
			... on Bookmark {
				id
				...BookmarkEvent
			}
			... on MediaAnnotation {
				id
				...AnnotationEvent
			}
		}
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function SessionWithEventsTimeline({ fragmentRef }: Props) {
	const { t } = useTranslate()
	const { session, events } = useFragment(fragment, fragmentRef)

	const endPage = session.endPage ?? session.endLocator?.locations?.position ?? '??'
	const startPage = session.startPage ?? session.startLocator?.locations?.position ?? '??'

	const fakeOpenTranslation = t('readingSessions.openedBookSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})
	const fakeCloseTranslation = t('readingSessions.closedBookSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})

	const order = useSessionDetailOrderStore((state) => state.order)

	const OpenEvent = (
		<EventTimelineRow
			icon={{
				as: BookOpen,
				shape: 'rounded',
			}}
			timestamp={session.createdAt}
			feedType="events"
		>
			<TemplatedTranslationText
				className="text-foreground-muted"
				fakeTranslation={fakeOpenTranslation}
				values={{
					PAGE_FRAGMENT: t('readingSessions.pageFragment', { page: startPage }),
				}}
			/>
		</EventTimelineRow>
	)

	const CloseEvent = (
		<EventTimelineRow
			icon={{
				as: Book,
				shape: 'rounded',
			}}
			timestamp={session.updatedAt}
			feedType="events"
		>
			<TemplatedTranslationText
				className="text-foreground-muted"
				fakeTranslation={fakeCloseTranslation}
				values={{
					PAGE_FRAGMENT: t('readingSessions.pageFragment', { page: endPage }),
				}}
			/>
		</EventTimelineRow>
	)

	return (
		<Card.Row renderDivider={false}>
			<View className="w-full">
				{order === OrderDirection.Asc ? OpenEvent : CloseEvent}

				{events.map((event) => (
					<EventRenderer
						key={`${event.__typename}-${event.id}-session-${session.id}`}
						event={event}
						session={session}
						feedType="events"
					/>
				))}

				{order === OrderDirection.Asc ? CloseEvent : OpenEvent}
			</View>
		</Card.Row>
	)
}
