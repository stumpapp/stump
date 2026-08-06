import { Alert, AlertDescription, AlertTitle, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function DeleteHistoryConfirmation({ isOpen, onCancel, onConfirm }: Props) {
	const { t } = useLocaleContext()
	return (
		<ConfirmationModal
			title={t('entityUi.deleteHistoryTitle')}
			description={t('entityUi.deleteHistoryDescription')}
			isOpen={isOpen}
			onClose={onCancel}
			onConfirm={onConfirm}
			confirmVariant="destructive"
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle>{t('common.thisActionCannotBeUndone')}</AlertTitle>
				<AlertDescription>{t('entityUi.deleteHistoryWarning')}</AlertDescription>
			</Alert>
		</ConfirmationModal>
	)
}
