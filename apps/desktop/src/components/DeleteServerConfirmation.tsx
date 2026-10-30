import { ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

type Props = {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	serverName: string
}

// TODO: loading state
export default function DeleteServerConfirmation({
	isOpen,
	onClose,
	onConfirm,
	serverName,
}: Props) {
	const { t } = useLocaleContext()

	return (
		<ConfirmationModal
			title={t('shared.savedServerActions.deleteServer.title')}
			description={t('shared.savedServerActions.deleteServer.confirmation', { serverName })}
			confirmText={t('shared.savedServerActions.deleteServer.title')}
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={onConfirm}
			confirmVariant="destructive"
			trigger={null}
			size="md"
		/>
	)
}
