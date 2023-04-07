import { isAxiosError } from '@stump/api'
import { useDeleteLibraryMutation } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { toast } from 'react-hot-toast'

import { useAppContext } from '../../context'

type Props = {
	libraryId: string
	onClose: () => void
	isOpen: boolean
}
export default function DeleteLibraryConfirmation({ isOpen, libraryId, onClose }: Props) {
	const { deleteLibraryAsync, isLoading } = useDeleteLibraryMutation()
	const { isServerOwner } = useAppContext()

	async function handleDelete() {
		if (isServerOwner) {
			try {
				await deleteLibraryAsync(libraryId)
			} catch (err) {
				console.error(err)

				if (isAxiosError(err)) {
					toast.error(err.message || 'An error occurred while deleting the library')
				} else {
					toast.error('An error occurred while deleting the library')
				}
			}
		}
	}

	if (!isServerOwner) {
		throw new Error('You are not the server owner')
	}

	return (
		<ConfirmationModal
			title="Delete Library"
			description="Are you sure you want to delete this library? This action cannot be undone."
			confirmText="Delete Library"
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={handleDelete}
			confirmIsLoading={isLoading}
		/>
	)
}
