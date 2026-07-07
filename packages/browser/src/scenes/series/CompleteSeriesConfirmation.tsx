import { Alert, AlertTitle, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function CompleteSeriesConfirmation({ isOpen, onCancel, onConfirm }: Props) {
	return (
		<ConfirmationModal
			title="Mark series completed"
			description="Are you sure you want to mark every book in this series completed?"
			isOpen={isOpen}
			onClose={onCancel}
			onConfirm={onConfirm}
			confirmVariant="destructive"
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle>This cannot be undone</AlertTitle>
			</Alert>
		</ConfirmationModal>
	)
}
