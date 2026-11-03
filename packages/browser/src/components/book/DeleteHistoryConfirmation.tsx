import { Alert, AlertDescription, AlertTitle, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	name: string
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function DeleteHistoryConfirmation({ name, isOpen, onCancel, onConfirm }: Props) {
	const { translate } = useTranslate()

	return (
		<ConfirmationModal
			title={translate('shared.bookActions.deleteReadHistory.label')}
			description={translate('shared.bookActions.deleteReadHistory.confirmation', {
				bookTitle: name,
			})}
			isOpen={isOpen}
			onClose={onCancel}
			onConfirm={onConfirm}
			confirmVariant="destructive"
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle>{translate('shared.common.thisActionCannotBeUndone')}</AlertTitle>
				<AlertDescription>
					{translate('shared.bookActions.deleteReadHistory.disclaimer')}
				</AlertDescription>
			</Alert>
		</ConfirmationModal>
	)
}
