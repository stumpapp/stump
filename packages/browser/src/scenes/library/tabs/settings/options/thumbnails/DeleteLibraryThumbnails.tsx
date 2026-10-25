import { useGraphQLMutation } from '@stump/client'
import { Button, ConfirmationModal, NewCard } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'
import { invalidateThumbnailQueries } from '@/utils/query'

import { useLibraryManagement } from '../../context'

const mutation = graphql(`
	mutation DeleteLibraryThumbnails($id: ID!) {
		deleteLibraryThumbnails(id: $id)
	}
`)

export default function DeleteLibraryThumbnails() {
	const queryClient = useQueryClient()
	const {
		library: { id },
	} = useLibraryManagement()
	const { t, translate } = useTranslate()

	// This is a naive way to prevent the user from deleting the thumbnails multiple times
	// in a row. I don't feel it would be worth it to implement a more robust solution.
	const [showConfirmation, setShowConfirmation] = useState(false)

	const { mutateAsync: deleteThumbnails, isPending, data } = useGraphQLMutation(mutation)

	const handleDeleteThumbnails = useCallback(async () => {
		try {
			await deleteThumbnails({ id })
			await invalidateThumbnailQueries(queryClient)
			toast.success('Library thumbnails deleted')
		} catch (error) {
			console.error(error)
			const fallbackMessage = 'An error occurred while deleting the library thumbnails'
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		}
	}, [id, deleteThumbnails, queryClient])

	return (
		<>
			<NewCard.Row
				label={t('thumbnailManagement.deleteThumbnails.label')}
				description={t('thumbnailManagement.deleteThumbnails.descriptionLibrary')}
			>
				<Button
					variant="destructive"
					onClick={() => setShowConfirmation(true)}
					className="shrink-0"
					disabled={isPending || !!data}
				>
					{translate('shared.common.delete')}
				</Button>
			</NewCard.Row>

			<ConfirmationModal
				title={t('thumbnailManagement.deleteThumbnails.label')}
				description={translate('shared.common.thisActionCannotBeUndone')}
				confirmText={translate('shared.common.delete')}
				confirmVariant="destructive"
				isOpen={showConfirmation && !data}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isPending}
			/>
		</>
	)
}
