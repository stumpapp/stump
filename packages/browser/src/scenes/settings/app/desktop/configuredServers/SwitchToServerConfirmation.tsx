import { ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/types'
import React from 'react'

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
						<b>{t(getKey('server'))}:</b> {displayedServer.name}
					</div>
					<div>
						<b>{t(getKey('uri'))}:</b> {displayedServer.uri}
					</div>
				</div>
			)}
		</ConfirmationModal>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.switchToServer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
