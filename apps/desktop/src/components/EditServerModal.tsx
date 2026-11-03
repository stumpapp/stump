import { ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { CreateServer, SavedServer } from '../stores/savedServer'
import { CREATE_OR_UPDATE_SERVER_FORM_ID, CreateOrUpdateSavedServerForm } from './createOrUpdate'

type Props = {
	editingServer: SavedServer | null
	existingServers: SavedServer[]
	onEditServer: (updates: CreateServer) => void
	onCancel: () => void
}

export default function EditServerModal({
	editingServer,
	existingServers,
	onCancel,
	onEditServer,
}: Props) {
	const { t } = useLocaleContext()

	return (
		<ConfirmationModal
			isOpen={!!editingServer}
			onClose={onCancel}
			title={t('shared.addOrEditServer.updateServer')}
			confirmText={t('shared.common.saveChanges')}
			formId={CREATE_OR_UPDATE_SERVER_FORM_ID}
			trigger={null}
		>
			<CreateOrUpdateSavedServerForm
				editingServer={editingServer || undefined}
				existingServers={existingServers}
				onSubmit={onEditServer}
			/>
		</ConfirmationModal>
	)
}
