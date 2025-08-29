import { useGraphQLMutation, useSDK } from '@stump/client'
import { Alert, AlertDescription, AlertTitle, ConfirmationModal } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { handleApiError } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import paths from '@/paths'

type Props = {
	id: string
	onClose: () => void
	isOpen: boolean
	trigger?: React.ReactNode
}

const mutation = graphql(`
	mutation DeleteSmartList($id: ID!) {
		deleteSmartList(id: $id) {
			__typename
		}
	}
`)

export default function DeleteListConfirmation({ isOpen, id, onClose, trigger }: Props) {
	const navigate = useNavigate()
	const client = useQueryClient()
	const { sdk } = useSDK()

	const { t } = useLocaleContext()
	const { mutate, isPending: isDeleting } = useGraphQLMutation(mutation, {
		mutationKey: [sdk.cacheKeys.smartListDelete, id],
		onSettled: (_, error) => {
			if (error) {
				setErrorMessage(handleApiError(error))
			} else {
				client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartLists], exact: false })
				navigate(paths.smartLists())
			}
		},
	})

	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const handleDelete = useCallback(async () => {
		try {
			setErrorMessage(null)
			mutate({ id })
		} catch (err) {
			setErrorMessage(handleApiError(err))
		}
	}, [mutate, id])

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
				<Alert variant="destructive">
					<AlertCircle />
					<AlertTitle>{t('common.somethingWentWrong')}</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}
		</ConfirmationModal>
	)
}

const LOCALE_KEY = 'smartListSettingsScene.danger-zone/delete.sections.deleteList.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
