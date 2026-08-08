import { Alert, AlertTitle, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function CompleteSeriesConfirmation({ isOpen, onCancel, onConfirm }: Props) {
	const { t } = useLocaleContext()
	return (
		<ConfirmationModal
			title={t('entityUi.completeSeries.title')}
			description={t('entityUi.completeSeries.description')}
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
