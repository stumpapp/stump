import { ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/sdk'

import {
	CREATE_OR_UPDATE_SERVER_FORM_ID,
	CreateOrUpdateSavedServerForm,
} from '@/components/savedServer'

type Props = {
	editingServer: SavedServer | null
	existingServers: SavedServer[]
	onEditServer: (updates: SavedServer) => void
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
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
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

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.editServer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
