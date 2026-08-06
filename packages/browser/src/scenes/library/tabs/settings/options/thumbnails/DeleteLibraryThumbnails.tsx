import { useGraphQLMutation } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	ConfirmationModal,
	Heading,
	Text,
} from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { useLibraryManagement } from '../../context'

const mutation = graphql(`
	mutation DeleteLibraryThumbnails($id: ID!) {
		deleteLibraryThumbnails(id: $id)
	}
`)

export default function DeleteLibraryThumbnails() {
	const { t } = useLocaleContext()
	const {
		library: { id },
	} = useLibraryManagement()

	// This is a naive way to prevent the user from deleting the thumbnails multiple times
	// in a row. I don't feel it would be worth it to implement a more robust solution.
	const [showConfirmation, setShowConfirmation] = useState(false)

	const { mutateAsync: deleteThumbnails, isPending, data } = useGraphQLMutation(mutation)

	const handleDeleteThumbnails = useCallback(async () => {
		try {
			await deleteThumbnails({ id })
			toast.success(t('libraryUi.deleteSuccess'))
		} catch (error) {
			console.error(error)
			const fallbackMessage = t('libraryUi.deleteError')
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		}
	}, [id, deleteThumbnails, t])

	return (
		<>
			<div>
				<Heading size="sm">{t('libraryUi.delete')}</Heading>
				<Text size="sm" variant="muted">
					{t('libraryUi.deleteDescription')}
				</Text>
			</div>

			<div className="flex">
				<Button
					variant="destructive"
					onClick={() => setShowConfirmation(true)}
					className="shrink-0"
					disabled={isPending || !!data}
				>
					{t('libraryUi.delete')}
				</Button>
			</div>

			<ConfirmationModal
				title={t('libraryUi.deleteTitle')}
				description={t('libraryUi.deleteConfirmation')}
				confirmText={t('libraryUi.delete')}
				confirmVariant="destructive"
				isOpen={showConfirmation && !data}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isPending}
				size="md"
			>
				<Alert variant="warning">
					<AlertTriangle />
					<AlertTitle>{t('common.thisActionCannotBeUndone')}</AlertTitle>
					<AlertDescription>{t('libraryUi.deleteWarning')}</AlertDescription>
				</Alert>
			</ConfirmationModal>
		</>
	)
}
