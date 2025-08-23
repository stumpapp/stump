import { Alert, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

type Props = {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	isLastServer: boolean
}

// TODO: loading state
export default function DeleteServerConfirmation({
	isOpen,
	onClose,
	onConfirm,
	isLastServer,
}: Props) {
	const { t } = useLocaleContext()

	const renderDisclaimer = useCallback(() => {
		if (isLastServer) {
			return null
		}

		const message = t(
			isLastServer ? getKey('disclaimerLastServer') : getKey('disclaimerActiveServer'),
		)

		return (
			<Alert level={isLastServer ? 'error' : 'warning'} icon={isLastServer ? 'warning' : 'info'}>
				<Alert.Content>{message}</Alert.Content>
			</Alert>
		)
	}, [isLastServer, t])

	return (
		<ConfirmationModal
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={onConfirm}
			confirmVariant="danger"
			trigger={null}
			size="md"
		>
			{renderDisclaimer()}
		</ConfirmationModal>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.deleteServer.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
