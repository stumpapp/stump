import { useGraphQLMutation, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { ApiKeyTableQuery, graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import { APIKey } from './APIKeyTable'

const mutation = graphql(`
	mutation DeleteAPIKeyConfirmModal($id: Int!) {
		deleteApiKey(id: $id) {
			id
		}
	}
`)

type Props = {
	apiKey: APIKey | null
	onClose: () => void
}

export default function DeleteAPIKeyConfirmModal({ apiKey, onClose }: Props) {
	const { sdk } = useSDK()
	const { t } = useTranslate()

	const client = useQueryClient()

	const { mutate: deleteKey, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ deleteApiKey: { id } }) => {
			client.setQueryData(sdk.cacheKey('apiKeys'), (data?: ApiKeyTableQuery) => {
				return {
					...data,
					apiKeys: data?.apiKeys.filter((key) => key.id !== id) || [],
				}
			})
			onClose()
		},
	})

	const handleConfirm = useCallback(() => {
		if (apiKey) {
			deleteKey({ id: apiKey.id })
		}
	}, [apiKey, deleteKey])

	return (
		<ConfirmationModal
			title={t('settingsScene.app/apiKeys.sections.deleteKey.title')}
			description={t('settingsScene.app/apiKeys.sections.deleteKey.description')}
			confirmText={t('settingsScene.app/apiKeys.sections.deleteKey.confirm')}
			confirmVariant="destructive"
			isOpen={!!apiKey}
			onClose={onClose}
			onConfirm={handleConfirm}
			confirmIsLoading={isPending}
			trigger={null}
		/>
	)
}
