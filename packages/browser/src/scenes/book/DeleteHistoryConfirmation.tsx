import { Alert, AlertDescription, AlertTitle, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}

export default function DeleteHistoryConfirmation({ isOpen, onCancel, onConfirm }: Props) {
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
				<AlertDescription>{t(getKey('warning'))}</AlertDescription>
			</Alert>
		</ConfirmationModal>
	)
}

const LOCALE_KEY = 'bookOverviewScene.deleteHistoryConfirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
