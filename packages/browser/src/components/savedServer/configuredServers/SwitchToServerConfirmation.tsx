import { ConfirmationModal, Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/sdk'

import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'

type Props = {
	server: SavedServer | null
	onConfirm: () => void
	onCancel: () => void
}

export default function SwitchToServerConfirmation({ server, onConfirm, onCancel }: Props) {
	const { t } = useLocaleContext()

	const displayedServer = useCurrentOrPrevious(server)

	return (
		<ConfirmationModal
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
			isOpen={!!server}
			onClose={onCancel}
			onConfirm={onConfirm}
			trigger={null}
		>
			{displayedServer && (
				<div className="flex flex-col gap-2">
					<div>
						<Label>{t(getKey('server'))}</Label>
						<Text variant="muted" size="sm">
							{displayedServer.name}
						</Text>
					</div>

					<div>
						<Label>{t(getKey('uri'))}</Label>
						<Text variant="muted" size="sm">
							{displayedServer.uri}
						</Text>
					</div>
				</div>
			)}
		</ConfirmationModal>
	)
}

const LOCALE_KEY =
	'settingsScene.app/desktop.sections.configuredServers.switchToServer.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
