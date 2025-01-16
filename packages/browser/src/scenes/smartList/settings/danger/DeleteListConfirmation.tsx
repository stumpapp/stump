import { useDeleteSmartList } from '@stump/client'
import { Alert, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { handleApiError } from '@stump/sdk'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import paths from '@/paths'

type Props = {
	id: string
	onClose: () => void
	isOpen: boolean
	trigger?: React.ReactNode
}

export default function DeleteListConfirmation({ isOpen, id, onClose, trigger }: Props) {
	const navigate = useNavigate()

	const { t } = useLocaleContext()
	const { deleteAsync: deleteList, isDeleting } = useDeleteSmartList({
		onSuccess: () => {
			navigate(paths.smartLists())
		},
	})

	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const handleDelete = useCallback(async () => {
		try {
			setErrorMessage(null)
			await deleteList(id)
		} catch (err) {
			setErrorMessage(handleApiError(err))
		}
	}, [deleteList, id])

	return (
		<ConfirmationModal
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={handleDelete}
			confirmIsLoading={isDeleting}
			trigger={trigger}
		>
			{errorMessage && (
				<Alert level="error" icon="error">
					<Alert.Content>{errorMessage}</Alert.Content>
				</Alert>
			)}
		</ConfirmationModal>
	)
}

const LOCALE_KEY = 'smartListSettingsScene.danger-zone/delete.sections.deleteList.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
