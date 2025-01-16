import { invalidateQueries, useMutation, useSDK } from '@stump/client'
import { Button } from '@stump/components'
import { Media, PutMediaCompletionStatus } from '@stump/sdk'
import { useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'

import { EBOOK_EXTENSION } from '@/utils/patterns'

import { isReadAgainPrompt } from './BookReaderLink'

type Props = {
	book: Media
}

export default function BookCompletionToggleButton({ book }: Props) {
	const { sdk } = useSDK()

	const { mutateAsync: completeBook } = useMutation(
		[sdk.media.keys.complete, book.id],
		(payload: PutMediaCompletionStatus) => sdk.media.complete(book.id, payload),
	)

	const { mutateAsync: deleteCurrentSession } = useMutation(
		[sdk.media.keys.deleteActiveReadingSession, book.id],
		() => sdk.media.deleteActiveReadingSession(book.id),
	)

	const isCompleted = useMemo(() => isReadAgainPrompt(book), [book])
	const hasProgress = useMemo(() => !!book.active_reading_session, [book])
	const isEpub = useMemo(() => book.extension.match(EBOOK_EXTENSION), [book])

	const handleClick = useCallback(async () => {
		// If we've got progress and have previously finished the book, we just need
		// to clear the current progress
		if (hasProgress && isCompleted) {
			try {
				await deleteCurrentSession()
				invalidateQueries({ keys: [sdk.media.keys.getByID] })
			} catch (error) {
				console.error(error)
				toast.error('Failed to clear progress')
			}
		} else {
			const willBeComplete = !isCompleted
			const page = isEpub ? undefined : willBeComplete ? book.pages : 0
			try {
				await completeBook({
					is_complete: willBeComplete,
					page,
				})
				invalidateQueries({ keys: [sdk.media.keys.getByID] })
			} catch (error) {
				console.error(error)
				toast.error('Failed to update book completion status')
			}
		}
	}, [book, completeBook, isCompleted, isEpub, hasProgress, deleteCurrentSession, sdk.media])

	// There really isn't anything to do here if the book is completed and has no progress. Eventually,
	// we will support clearing the completion history.
	if (isCompleted && !hasProgress) {
		return null
	}

	const renderContent = () => {
		if (hasProgress) {
			return 'Clear progress'
		} else {
			return `Mark as ${isCompleted ? 'unread' : 'read'}`
		}
	}

	return (
		<div className="flex w-full md:w-auto">
			<Button variant="secondary" className="w-full md:w-auto" onClick={handleClick}>
				{renderContent()}
			</Button>
		</div>
	)
}
