import { Button, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useState } from 'react'

import { CreateServer, SavedServer } from '../stores/savedServer'
import { CREATE_OR_UPDATE_SERVER_FORM_ID, CreateOrUpdateSavedServerForm } from './createOrUpdate'

type Props = {
	existingServers: SavedServer[]
	onCreateServer: (server: CreateServer) => void
}

export default function AddServerModal({ existingServers, onCreateServer }: Props) {
	const { t } = useLocaleContext()

	const [isCreatingServer, setIsCreatingServer] = useState(false)

	const handleCreateServer = useCallback(
		(server: CreateServer) => {
			onCreateServer(server)
			setIsCreatingServer(false)
		},
		[onCreateServer],
	)

	return (
		<ConfirmationModal
			isOpen={isCreatingServer}
			onClose={() => setIsCreatingServer(false)}
			title={t('shared.addOrEditServer.createServer')}
			confirmText={t('shared.addOrEditServer.createServer')}
			formId={CREATE_OR_UPDATE_SERVER_FORM_ID}
			trigger={
				<Button size="sm" onClick={() => setIsCreatingServer(true)}>
					{t('shared.addOrEditServer.createServer')}
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
