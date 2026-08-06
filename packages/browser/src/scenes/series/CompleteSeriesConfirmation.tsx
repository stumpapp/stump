import { Alert, AlertTitle, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'
import { useLocaleContext } from '@stump/i18n'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function CompleteSeriesConfirmation({ isOpen, onCancel, onConfirm }: Props) {
	const { t } = useLocaleContext()
	return (
		<ConfirmationModal
			title={t('entityUi.completeSeriesTitle')}
			description={t('entityUi.completeSeriesDescription')}
			isOpen={isOpen}
			onClose={onCancel}
			onConfirm={onConfirm}
			confirmVariant="destructive"
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle>{t('common.thisActionCannotBeUndone')}</AlertTitle>
			</Alert>
		</ConfirmationModal>
	)
}
