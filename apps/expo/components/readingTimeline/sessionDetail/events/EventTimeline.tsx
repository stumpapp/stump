import { FragmentType, graphql, OrderDirection, useFragment } from '@stump/graphql'
import { ArrowDownRight, ArrowUpRight, Book, BookOpen } from 'lucide-react-native'
import React from 'react'
import { Pressable, View } from 'react-native'

import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card, Icon, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

import { useEventOrderStore } from '../store'
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
		events(order: $eventOrder) {
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

	const order = useEventOrderStore((state) => state.order)
	const setOrder = useEventOrderStore((state) => state.setOrder)

	const OpenEvent = (
		<EventTimelineRow
			icon={{
				as: BookOpen,
				shape: 'rounded',
			}}
			timestamp={data.createdAt}
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
						<React.Fragment key={JSON.stringify(event)}>{renderEvent(event)}</React.Fragment>
					))}

					{order === OrderDirection.Asc ? CloseEvent : OpenEvent}
				</View>
			</Card.Row>
		</Card>
	)
}
