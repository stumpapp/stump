import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Book, BookOpen } from 'lucide-react-native'
import React from 'react'
import { View } from 'react-native'

import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

import { AnnotationEvent } from './AnnotationEvent'
import { BookmarkEvent } from './BookmarkEvent'
import { EventTimelineRow } from './EventTimelineRow'

const fragment = graphql(`
	fragment EventTimeline on ReadingSession {
		createdAt
		startPage
		startLocator {
			locations {
				position
			}
		}
		events {
			__typename
			... on Bookmark {
				...BookmarkEvent
			}
			... on MediaAnnotation {
				...AnnotationEvent
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
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function EventTimeline({ fragmentRef }: Props) {
	const { t } = useTranslate()
	const data = useFragment(fragment, fragmentRef)

	const renderEvent = (event: (typeof data.events)[number]) => {
		switch (event.__typename) {
			case 'Bookmark':
				return <BookmarkEvent fragmentRef={event} />
			case 'MediaAnnotation':
				return <AnnotationEvent fragmentRef={event} />
			default:
				return null
		}
	}

	const endPage = data.endPage ?? data.endLocator?.locations?.position ?? '??'
	const startPage = data.startPage ?? data.startLocator?.locations?.position ?? '??'

	const fakeOpenTranslation = t('readingSessions.openedBookSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})
	const fakeCloseTranslation = t('readingSessions.closedBookSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})

	return (
		<Card
			// TODO: support this? api does, not much work to do it just need a callback, the current order, and
			// swapping the start/end events depending on order
			actions={<Text className="text-foreground-muted">Newest first</Text>}
		>
			<Card.Row>
				<View className="w-full">
					<EventTimelineRow
						icon={{
							as: BookOpen,
							shape: 'rounded',
						}}
						timestamp={data.createdAt}
						showTopConnector={false}
					>
						<TemplatedTranslationText
							className="text-foreground-muted"
							fakeTranslation={fakeOpenTranslation}
							values={{
								PAGE_FRAGMENT: t('readingSessions.pageFragment', { page: startPage }),
							}}
						/>
					</EventTimelineRow>

					{data.events.map((event) => (
						<React.Fragment key={JSON.stringify(event)}>{renderEvent(event)}</React.Fragment>
					))}

					<EventTimelineRow
						icon={{
							as: Book,
							shape: 'rounded',
						}}
						timestamp={data.updatedAt}
						showBottomConnector={false}
					>
						<TemplatedTranslationText
							className="text-foreground-muted"
							fakeTranslation={fakeCloseTranslation}
							values={{
								PAGE_FRAGMENT: t('readingSessions.pageFragment', { page: endPage }),
							}}
						/>
					</EventTimelineRow>
				</View>

				{/*TODO: start event*/}
			</Card.Row>
		</Card>
	)
}
