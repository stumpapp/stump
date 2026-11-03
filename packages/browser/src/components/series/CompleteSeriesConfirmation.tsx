import { Alert, AlertTitle, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export function CompleteSeriesConfirmation({ isOpen, onCancel, onConfirm }: Props) {
	const { translate } = useTranslate()

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
				<AlertTitle>{translate('shared.common.thisActionCannotBeUndone')}</AlertTitle>
				{/*nuance here, "cannot be undone" in the sense that if you already had progression then
				you won't be able to untangle it in bulk*/}
			</Alert>
		</ConfirmationModal>
	)
}
