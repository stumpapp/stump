import { mediaApi, mediaQueryKeys } from '@stump/api'
import { invalidateQueries, useMutation } from '@stump/client'
import { Button } from '@stump/components'
import { Media, PutMediaCompletionStatus } from '@stump/types'
import React, { useMemo } from 'react'
import toast from 'react-hot-toast'

import { EBOOK_EXTENSION } from '@/utils/patterns'

import { isReadAgainPrompt } from './BookReaderLink'

type Props = {
	book: Media
}

export default function BookCompletionToggleButton({ book }: Props) {
	const { mutateAsync } = useMutation(
		[mediaQueryKeys.putMediaCompletion, book.id],
		(payload: PutMediaCompletionStatus) => mediaApi.putMediaCompletion(book.id, payload),
	)

	const isCompleted = useMemo(() => isReadAgainPrompt(book), [book])
	const isEpub = useMemo(() => book.extension.match(EBOOK_EXTENSION), [book])

	const handleClick = async () => {
		const willBeComplete = !isCompleted
		const page = isEpub ? undefined : willBeComplete ? book.pages : 1
		try {
			await mutateAsync({
				is_complete: willBeComplete,
				page,
			})
			invalidateQueries({ keys: [mediaQueryKeys.getMediaById] })
		} catch (error) {
			console.error(error)
			toast.error('Failed to update book completion status')
		}
	}

	return (
		<div className="flex w-full md:w-auto">
			<Button variant="secondary" className="w-full md:w-auto" onClick={handleClick}>
				Mark as {isCompleted ? 'unread' : 'read'}
			</Button>
		</div>
	)
}
