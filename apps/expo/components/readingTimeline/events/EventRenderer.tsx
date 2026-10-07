import { AnnotationEventFragment } from '@stump/graphql'
import { useRef } from 'react'

import {
	UpdateAnnotationSheet,
	UpdateAnnotationSheetRef,
} from '~/components/book/reader/epub/annotations'
import { intoReadiumLocator } from '~/modules/readium'

import { AnnotationEvent } from './AnnotationEvent'
import { BookmarkEvent } from './BookmarkEvent'
import { useEventMutations } from './useEventMutations'

type WithTypename<F, T> = F & {
	__typename: T
}

type BookmarkFragment = WithTypename<
	React.ComponentProps<typeof BookmarkEvent>['fragmentRef'],
	'Bookmark'
>
type AnnotationFragment = WithTypename<
	React.ComponentProps<typeof AnnotationEvent>['fragmentRef'],
	'MediaAnnotation'
>

type Event = BookmarkFragment | AnnotationFragment

type Props = {
	event: Event
	session: {
		id: number
		mediaId: string
	}
	feedType: 'sessions' | 'events'
}

export function EventRenderer({ event, session, feedType }: Props) {
	const { updateAnnotation, deleteAnnotation } = useEventMutations({ session })

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

	const renderEvent = () => {
		switch (event.__typename) {
			case 'Bookmark':
				return <BookmarkEvent fragmentRef={event} feedType={feedType} />
			case 'MediaAnnotation':
				return (
					<AnnotationEvent fragmentRef={event} onPress={onAnnotationPress} feedType={feedType} />
				)
			default:
				return null
		}
	}

	return (
		<>
			{renderEvent()}

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
