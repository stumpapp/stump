import { ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

type Props = {
	isOpen: boolean
	onClose: (didConfirm: boolean) => void
}

export default function RemoveMemberConfirmation({ isOpen, onClose }: Props) {
	const { t } = useLocaleContext()
	return (
		<ConfirmationModal
			isOpen={isOpen}
			onConfirm={() => onClose(true)}
			onClose={() => onClose(false)}
			title={t('bookClubUi.removeMember')}
			description={t('bookClubUi.removeMemberDescription')}
			confirmText={t('common.confirm')}
			confirmVariant="destructive"
			size="sm"
		/>
	)
}
