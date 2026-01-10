import { Alert, AlertDescription, AlertTitle, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function DeleteHistoryConfirmation({ isOpen, onCancel, onConfirm }: Props) {
	return (
		<ConfirmationModal
			title="Delete reading history"
			description="Are you sure you want to delete your reading history?"
			isOpen={isOpen}
			onClose={onCancel}
			onConfirm={onConfirm}
			confirmVariant="danger"
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle>This cannot be undone</AlertTitle>
				<AlertDescription>
					Your completion history cannot be recovered once deleted
				</AlertDescription>
			</Alert>
		</ConfirmationModal>
	)
}
