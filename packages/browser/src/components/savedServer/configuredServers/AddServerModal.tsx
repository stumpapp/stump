import { Button, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/sdk'
import { useCallback, useState } from 'react'

import {
	CREATE_OR_UPDATE_SERVER_FORM_ID,
	CreateOrUpdateSavedServerForm,
} from '@/components/savedServer'

type Props = {
	existingServers: SavedServer[]
	onCreateServer: (server: SavedServer) => void
}

export default function AddServerModal({ existingServers, onCreateServer }: Props) {
	const { t } = useLocaleContext()

	const [isCreatingServer, setIsCreatingServer] = useState(false)

	const handleCreateServer = useCallback(
		(server: SavedServer) => {
			onCreateServer(server)
			setIsCreatingServer(false)
		},
		[onCreateServer],
	)

	return (
		<ConfirmationModal
			isOpen={isCreatingServer}
			onClose={() => setIsCreatingServer(false)}
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
			formId={CREATE_OR_UPDATE_SERVER_FORM_ID}
			trigger={
				<Button size="sm" variant="primary" onClick={() => setIsCreatingServer(true)}>
					{t(getKey('trigger'))}
				</Button>
			}
		>
			<CreateOrUpdateSavedServerForm
				existingServers={existingServers}
				onSubmit={handleCreateServer}
			/>
		</ConfirmationModal>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.addServer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
