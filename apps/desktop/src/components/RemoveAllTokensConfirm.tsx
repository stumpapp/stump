import { Alert, Button, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
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
				size="sm"
			/>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.resetTokens.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
