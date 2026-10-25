import { ConfirmationModal } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	isOpen: boolean
	onClose: (didConfirm: boolean) => void
}

export default function RemoveMemberConfirmation({ isOpen, onClose }: Props) {
	const { t, translate } = useTranslate()

	return (
		<ConfirmationModal
			isOpen={isOpen}
			onConfirm={() => onClose(true)}
			onClose={() => onClose(false)}
			title={t('bookClubSettingsScene.members.removeConfirmation.title')}
			description={t('bookClubSettingsScene.members.removeConfirmation.description')}
			confirmText={translate('shared.common.confirm')}
			confirmVariant="destructive"
			size="sm"
		/>
	)
}
