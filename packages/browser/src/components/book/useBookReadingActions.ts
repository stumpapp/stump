import { EBOOK_EXTENSION, PDF_EXTENSION, useGraphQLMutation } from '@stump/client'
import { extractErrorMessage, FragmentType, graphql, useFragment } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

const fragment = graphql(`
	fragment BookReadingActions on Media {
		id
		extension
		readProgress {
			page
			locator {
				href
			}
		}
		readHistory {
			__typename
		}
	}
`)

const completedMutation = graphql(`
	mutation BookReadingActionsComplete($id: ID!) {
		finishMediaProgress(id: $id)
	}
`)

const deleteMutation = graphql(`
	mutation BookReadingActionsDeleteSession($id: ID!) {
		clearMediaProgress(id: $id)
	}
`)

const deleteHistoryMutation = graphql(`
	mutation BookReadingActionsDeleteHistory($id: ID!) {
		deleteMediaReadingHistory(id: $id)
	}
`)

export type BookReadingActionsRef = FragmentType<typeof fragment>

export function useBookReadingActions(data: BookReadingActionsRef) {
	const book = useFragment(fragment, data)
	const paths = usePaths()
	const client = useQueryClient()

	const { translate } = useTranslate()

	const onSuccess = () => client.invalidateQueries({ queryKey: ['bookOverview', book.id] })

	const onError = (title: string, error: unknown) => {
		toast.error(title, {
			description: extractErrorMessage(error, translate('shared.common.unknownError')),
		})
	}

	const { mutate: completeBook } = useGraphQLMutation(completedMutation, {
		onSuccess,
		onError: (error) => onError(translate('shared.bookActions.markAsRead.failure'), error),
	})
	const { mutate: deleteCurrentSession } = useGraphQLMutation(deleteMutation, {
		onSuccess,
		onError: (error) => onError(translate('shared.bookActions.clearProgress.failure'), error),
	})
	const { mutate: deleteReadHistory } = useGraphQLMutation(deleteHistoryMutation, {
		onSuccess,
		onError: (error) => onError(translate('shared.bookActions.deleteReadHistory.failure'), error),
	})

	const isReading = !!book.readProgress
	const isPreviouslyCompleted = !!book.readHistory?.length
	const isUntouched = !isReading && !isPreviouslyCompleted

	const isEpub = EBOOK_EXTENSION.test(book.extension) || !!book.readProgress?.locator?.href
	const page = book.readProgress?.page

	const readFromBeginning = (isIncognito?: boolean) =>
		paths.bookReader(book.id, isEpub ? { isEpub, isIncognito } : { page: 1, isIncognito })

	const getResumeLink = () => {
		if (isEpub) return paths.bookReader(book.id, { isEpub })
		if (page) return paths.bookReader(book.id, { page })
		return readFromBeginning()
	}

	const links = {
		resume: getResumeLink(),
		fromBeginning: readFromBeginning(),
		incognito: readFromBeginning(true),
		nativePdf: PDF_EXTENSION.test(book.extension)
			? paths.bookReader(book.id, { isPdf: true, isStreaming: false })
			: undefined,
	}

	return {
		isReading,
		isPreviouslyCompleted,
		isUntouched,
		links,
		completeBook: () => completeBook({ id: book.id }),
		deleteCurrentSession: () => deleteCurrentSession({ id: book.id }),
		deleteReadHistory: () => deleteReadHistory({ id: book.id }),
	}
}
