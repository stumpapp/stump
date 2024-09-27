import { isAxiosError } from '@stump/api'
import { useDeleteLibrary } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router'

import { useAppContext } from '../../context'
import paths from '../../paths'

type Props = {
	libraryId: string
	onClose: () => void
	isOpen: boolean
	trigger?: React.ReactNode
}
export default function DeleteLibraryConfirmation({ isOpen, libraryId, onClose, trigger }: Props) {
	const navigate = useNavigate()

	const { deleteLibraryAsync, isLoading } = useDeleteLibrary({
		onSuccess: () => {
			navigate(paths.home())
		},
	})
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
		} else {
			throw new Error('You do not have permission to delete libraries.')
		}
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
			trigger={trigger}
		/>
	)
}
