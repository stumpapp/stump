import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Book, BookOpen } from 'lucide-react-native'
import { View } from 'react-native'

import { Card, Text } from '~/components/ui'

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

	return (
		<Card>
			<Card.Row>
				<View className="w-full">
					<EventTimelineRow
						icon={{
							as: BookOpen,
							shape: 'rounded',
						}}
						timestamp={data.createdAt}
					>
						<Text>Opened book at page {startPage}</Text>
					</EventTimelineRow>

					<View className="bg-black/10 dark:bg-white/10 ml-[6.25rem] min-h-[1.5rem] w-px" />
					{data.events.map((event) => {
						return (
							<View key={JSON.stringify(event)}>
								{renderEvent(event)}
								{/*TODO: do proper math, not just eyeball*/}
								{/*TODO: wrong height, prolly not in right place to get it to stretch*/}
								<View className="bg-black/10 dark:bg-white/10 ml-[6.25rem] min-h-[1.5rem] w-px" />
							</View>
						)
					})}

					<EventTimelineRow
						icon={{
							as: Book,
							shape: 'rounded',
						}}
						timestamp={data.createdAt}
					>
						<Text>Closed book at page {endPage}</Text>
					</EventTimelineRow>
				</View>

				{/*TODO: start event*/}
			</Card.Row>
		</Card>
	)
}
