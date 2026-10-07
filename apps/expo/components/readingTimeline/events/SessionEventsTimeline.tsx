import { useGraphQLMutation } from '@stump/client'
import {
	AnnotationEventFragment,
	FragmentType,
	graphql,
	OrderDirection,
	useFragment,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Book, BookOpen } from 'lucide-react-native'
import React, { useRef } from 'react'
import { Pressable, View } from 'react-native'

import {
	UpdateAnnotationSheet,
	UpdateAnnotationSheetRef,
} from '~/components/book/reader/epub/annotations'
import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card, Icon, Text } from '~/components/ui'
import { useSyncOnlineToOfflineAnnotations, useTranslate } from '~/lib/hooks'
import { intoReadiumLocator } from '~/modules/readium'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { useSessionDetailOrderStore } from '~/stores/readingTimeline'

import { AnnotationEvent } from './AnnotationEvent'
import { BookmarkEvent } from './BookmarkEvent'
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

// TODO: this can actually prob live with events still? not sure, we'll
// see how i progress forward after acutally impl and not just preemptive reorg

export function SessionEventsTimeline({ fragmentRef }: Props) {
	const { t } = useTranslate()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const data = useFragment(fragment, fragmentRef)
	const queryClient = useQueryClient()

	const { syncUpdate, syncDelete } = useSyncOnlineToOfflineAnnotations({
		bookId: data.mediaId,
		serverId,
	})

	const sessionId = data.id

	const invalidateAfterSuccess = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: ['sessionById', sessionId], exact: false }),
			queryClient.invalidateQueries({
				queryKey: ['mediaById', data.mediaId, 'readingTimeline'],
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
			bookId: data.mediaId,
			locator: intoReadiumLocator(annotation.locator),
			// TODO(highlights): support per-highlight color
			color: '#FFEB3B',
			createdAt: new Date(annotation.createdAt),
			updatedAt: new Date(annotation.createdAt),
			annotationText: annotation.annotationText ?? undefined,
		})
	}

	const renderEvent = (event: (typeof data.events)[number]) => {
		switch (event.__typename) {
			case 'Bookmark':
				return <BookmarkEvent fragmentRef={event} />
			case 'MediaAnnotation':
				return <AnnotationEvent fragmentRef={event} onPress={onAnnotationPress} />
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
		<>
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
