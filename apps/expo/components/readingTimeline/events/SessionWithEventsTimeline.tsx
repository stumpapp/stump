import { useGraphQLMutation } from '@stump/client'
import {
	AnnotationEventFragment,
	FragmentType,
	graphql,
	OrderDirection,
	useFragment,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Book, BookOpen } from 'lucide-react-native'
import React, { useRef } from 'react'
import { View } from 'react-native'

import {
	UpdateAnnotationSheet,
	UpdateAnnotationSheetRef,
} from '~/components/book/reader/epub/annotations'
import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card } from '~/components/ui'
import { useSyncOnlineToOfflineAnnotations, useTranslate } from '~/lib/hooks'
import { intoReadiumLocator } from '~/modules/readium'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { useSessionDetailOrderStore } from '~/stores/readingTimeline'

import { AnnotationEvent } from './AnnotationEvent'
import { BookmarkEvent } from './BookmarkEvent'
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
				...BookmarkEvent
			}
			... on MediaAnnotation {
				...AnnotationEvent
			}
		}
	}
`)

// TODO: move to shared spot and use in both flavors of timelines

const updateAnnotationMutation = graphql(`
	mutation UpdateAnnotationMobileEventTimeline($input: UpdateAnnotationInput!) {
		updateAnnotation(input: $input) {
			id
			annotationText
			updatedAt
		}
	}
`)

const deleteAnnotationMutation = graphql(`
	mutation DeleteAnnotationMobileEventTimeline($id: String!) {
		deleteAnnotation(id: $id) {
			id
		}
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function SessionWithEventsTimeline({ fragmentRef }: Props) {
	const { t } = useTranslate()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const { session, events } = useFragment(fragment, fragmentRef)
	const queryClient = useQueryClient()

	const { syncUpdate, syncDelete } = useSyncOnlineToOfflineAnnotations({
		bookId: session.mediaId,
		serverId,
	})

	const sessionId = session.id

	const invalidateAfterSuccess = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: ['sessionById', sessionId], exact: false }),
			queryClient.invalidateQueries({
				queryKey: ['mediaById', session.mediaId, 'readingTimeline'],
				exact: false,
			}),
		])

	const { mutateAsync: updateAnnotation } = useGraphQLMutation(updateAnnotationMutation, {
		onError: (error) => {
			console.error('Failed to update annotation:', error)
		},
		onSuccess: ({ updateAnnotation: updatedAnnotation }) => {
			invalidateAfterSuccess()
			syncUpdate(updatedAnnotation.id, updatedAnnotation.annotationText ?? null)
		},
	})

	const { mutateAsync: deleteAnnotation } = useGraphQLMutation(deleteAnnotationMutation, {
		onError: (error) => {
			console.error('Failed to delete annotation:', error)
		},
		onSuccess: ({ deleteAnnotation: deletedAnnotation }) => {
			invalidateAfterSuccess()
			syncDelete(deletedAnnotation.id)
		},
	})

	const updateAnnotationSheetRef = useRef<UpdateAnnotationSheetRef>(null)

	const onAnnotationPress = (annotation: AnnotationEventFragment) => {
		updateAnnotationSheetRef.current?.open({
			id: annotation.id,
			bookId: session.mediaId,
			locator: intoReadiumLocator(annotation.locator),
			// TODO(highlights): support per-highlight color
			color: '#FFEB3B',
			createdAt: new Date(annotation.createdAt),
			updatedAt: new Date(annotation.createdAt),
			annotationText: annotation.annotationText ?? undefined,
		})
	}

	const renderEvent = (event: (typeof events)[number]) => {
		switch (event.__typename) {
			case 'Bookmark':
				return <BookmarkEvent fragmentRef={event} feedType="events" />
			case 'MediaAnnotation':
				return <AnnotationEvent fragmentRef={event} onPress={onAnnotationPress} feedType="events" />
			default:
				return null
		}
	}

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
		<>
			<>
				<Card.Row
					// comment out for other mocks besides super imposed thumb mock
					renderDivider={false}
				>
					<View className="w-full">
						{order === OrderDirection.Asc ? OpenEvent : CloseEvent}

						{events.map((event) => (
							<React.Fragment key={JSON.stringify(event)}>{renderEvent(event)}</React.Fragment>
						))}

						{order === OrderDirection.Asc ? CloseEvent : OpenEvent}
					</View>
				</Card.Row>
			</>

			<UpdateAnnotationSheet
				// TODO: consider knobs to style the sheet, the blast of white
				// was not welcome when i opened for the first time compared
				// to the nice background
				ref={updateAnnotationSheetRef}
				onAnnotationChange={(id, annotationText) =>
					updateAnnotation({
						input: {
							id,
							annotationText,
						},
					})
				}
				onDelete={(id) => deleteAnnotation({ id })}
			/>
		</>
	)
}
