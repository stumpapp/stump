import { useGraphQLMutation } from '@stump/client'
import { Button } from '@stump/components'
import { BookCardFragment, graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import { EBOOK_EXTENSION } from '@/utils/patterns'

import { isReadAgainPrompt } from './BookReaderDropdown'

const completedMutation = graphql(`
	mutation BookCompletionToggleButtonComplete($id: ID!, $isComplete: Boolean!, $page: Int) {
		markMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {
			completedAt
		}
	}
`)

const deleteMutation = graphql(`
	mutation BookCompletionToggleButtonDeleteSession($id: ID!) {
		deleteMediaProgress(id: $id) {
			__typename
		}
	}
`)

type Props = {
	book: BookCardFragment
}
export default function BookCompletionToggleButton({ book }: Props) {
	const { mutate: completeBook } = useGraphQLMutation(completedMutation)
	const { mutate: deleteCurrentSession } = useGraphQLMutation(deleteMutation)

	const client = useQueryClient()
	const isCompleted = useMemo(() => isReadAgainPrompt(book), [book])
	const hasProgress = useMemo(() => !!book.readProgress, [book])
	const isEpub = useMemo(() => book.extension.match(EBOOK_EXTENSION), [book])

	const handleClick = useCallback(async () => {
		// If we've got progress and have previously finished the book, we just need
		// to clear the current progress
		if (hasProgress && isCompleted) {
			try {
				deleteCurrentSession({ id: book.id })
				await client.invalidateQueries({ queryKey: ['bookOverview', book.id], exact: false })
			} catch (error) {
				console.error(error)
				toast.error('Failed to clear progress')
			}
		} else {
			const willBeComplete = !isCompleted
			const page = isEpub ? undefined : willBeComplete ? book.pages : 0
			try {
				completeBook({ isComplete: willBeComplete, id: book.id, page })
				await client.invalidateQueries({ queryKey: ['bookOverview', book.id] })
			} catch (error) {
				console.error(error)
				toast.error('Failed to update book completion status')
			}
		}
	}, [book, completeBook, isCompleted, isEpub, hasProgress, deleteCurrentSession, client])

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
