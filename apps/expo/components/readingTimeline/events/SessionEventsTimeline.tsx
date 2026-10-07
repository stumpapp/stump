import { FragmentType, graphql, OrderDirection, useFragment } from '@stump/graphql'
import { ArrowDownRight, ArrowUpRight, Book, BookOpen } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card, Icon, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useSessionDetailOrderStore } from '~/stores/readingTimeline'

import { EventRenderer } from './EventRenderer'
import { EventTimelineRow } from './EventTimelineRow'

const fragment = graphql(`
	fragment SessionEventsTimeline on ReadingSession {
		id
		mediaId
		createdAt
		startPage
		startLocator {
			locations {
				position
			}
		}
		events(order: $eventOrder) {
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

export function SessionEventsTimeline({ fragmentRef }: Props) {
	const { t } = useTranslate()

	const data = useFragment(fragment, fragmentRef)
	const endPage = data.endPage ?? data.endLocator?.locations?.position ?? '??'
	const startPage = data.startPage ?? data.startLocator?.locations?.position ?? '??'

	const fakeOpenTranslation = t('readingSessions.openedBookSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})
	const fakeCloseTranslation = t('readingSessions.closedBookSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})

	const order = useSessionDetailOrderStore((state) => state.order)
	const setOrder = useSessionDetailOrderStore((state) => state.setOrder)

	const OpenEvent = (
		<EventTimelineRow
			icon={{
				as: BookOpen,
				shape: 'rounded',
			}}
			timestamp={data.createdAt}
			feedType="sessions"
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
			timestamp={data.updatedAt}
			feedType="sessions"
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
		<Card
			actions={
				<Pressable
					onPress={() =>
						setOrder(order === OrderDirection.Asc ? OrderDirection.Desc : OrderDirection.Asc)
					}
				>
					{({ pressed }) => (
						<View
							className="gap-1.5 flex flex-row items-center"
							style={pressed ? { opacity: 0.8 } : undefined}
						>
							<Text className="text-foreground-muted">
								{t(`sorting.sortDirectionDate.${order}`)}
							</Text>

							<Icon
								as={order === OrderDirection.Asc ? ArrowUpRight : ArrowDownRight}
								className="text-foreground-muted h-4 w-4"
							/>
						</View>
					)}
				</Pressable>
			}
		>
			<Card.Row>
				<View className="w-full">
					{order === OrderDirection.Asc ? OpenEvent : CloseEvent}

					{data.events.map((event) => (
						<EventRenderer
							key={`${event.__typename}-${event.id}-session-${data.id}`}
							event={event}
							session={data}
							feedType="events"
						/>
					))}

					{order === OrderDirection.Asc ? CloseEvent : OpenEvent}
				</View>
			</Card.Row>
		</Card>
	)
}
