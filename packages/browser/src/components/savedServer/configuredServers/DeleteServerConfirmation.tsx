import { Alert, AlertDescription, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import { useCallback } from 'react'

type Props = {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	isLastServer: boolean
	isActiveServer: boolean
}

// TODO: loading state
export default function DeleteServerConfirmation({
	isOpen,
	onClose,
	onConfirm,
	isLastServer,
	isActiveServer,
}: Props) {
	const { t } = useLocaleContext()

	const renderDisclaimer = useCallback(() => {
		if (!isActiveServer && !isLastServer) {
			return null
		}

		const message = t(
			isLastServer ? getKey('disclaimerLastServer') : getKey('disclaimerActiveServer'),
		)

		return (
			<Alert variant={isLastServer ? 'destructive' : 'warning'}>
				<AlertTriangle />
				<AlertDescription>{message}</AlertDescription>
			</Alert>
		)
	}, [isActiveServer, isLastServer, t])

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
