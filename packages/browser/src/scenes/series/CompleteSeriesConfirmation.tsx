import { Alert, AlertTitle, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function CompleteSeriesConfirmation({ isOpen, onCancel, onConfirm }: Props) {
	const { t, translate } = useTranslate()

	return (
		<ConfirmationModal
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={translate('shared.common.confirm')}
			cancelText={translate('shared.common.cancel')}
			isOpen={isOpen}
			onClose={onCancel}
			onConfirm={onConfirm}
			confirmVariant="destructive"
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle>{t('common.cannotBeUndone')}</AlertTitle>
			</Alert>
		</ConfirmationModal>
	)
}

const LOCALE_KEY = 'seriesOverviewScene.completeSeriesConfirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
