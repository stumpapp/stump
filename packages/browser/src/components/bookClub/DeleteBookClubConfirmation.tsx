import { useDeleteBookClub } from '@stump/client'
import { Alert, ConfirmationModal } from '@stump/components'
import { handleApiError } from '@stump/sdk'
import { useNavigate } from 'react-router'

import paths from '../../paths'

type Props = {
	id: string
	onClose: () => void
	isOpen: boolean
	trigger?: React.ReactNode
}

export default function DeleteBookClubConfirmation({ isOpen, id, onClose, trigger }: Props) {
	const navigate = useNavigate()

	const { deleteClub, isLoading, error } = useDeleteBookClub({
		id,
		onSuccess: () => {
			navigate(paths.bookClubs())
		},
	})

	const renderError = () => {
		if (!error) return null

		const message = handleApiError(error)
		return (
			<Alert level="error">
				<Alert.Content>{message}</Alert.Content>
			</Alert>
		)
	}

	return (
		<ConfirmationModal
			title="Delete book club"
			description="Are you sure you want to delete this club? This action cannot be undone."
			confirmText="Delete club"
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={() => deleteClub()}
			confirmIsLoading={isLoading}
			trigger={trigger}
		>
			{renderError()}
		</ConfirmationModal>
	)
}
