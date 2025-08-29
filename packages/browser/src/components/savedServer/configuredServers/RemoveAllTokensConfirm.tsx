import { Alert, AlertDescription, Button, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useState } from 'react'

type Props = {
	onConfirmClear: () => Promise<void>
}

export default function RemoveAllTokensConfirm({ onConfirmClear }: Props) {
	const { t } = useLocaleContext()

	const [showConfirmation, setShowConfirmation] = useState(false)

	const handleConfirmClear = useCallback(async () => {
		await onConfirmClear()
		setShowConfirmation(false)
	}, [onConfirmClear])

	return (
		<div>
			<ConfirmationModal
				isOpen={showConfirmation}
				onConfirm={handleConfirmClear}
				onClose={() => setShowConfirmation(false)}
				title={t(getKey('title'))}
				description={t(getKey('description'))}
				confirmText={t(getKey('confirm'))}
				confirmVariant="danger"
				trigger={
					<Button
						type="button"
						variant="danger"
						onClick={() => setShowConfirmation(true)}
						className="flex-shrink-0"
						size="sm"
					>
						{t(getKey('trigger'))}
					</Button>
				}
				size="md"
			>
				<Alert variant="warning">
					<AlertTriangle />
					<AlertDescription>{t(getKey('disclaimer'))} </AlertDescription>
				</Alert>
			</ConfirmationModal>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.resetTokens.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
