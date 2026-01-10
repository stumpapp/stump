import { useGraphQLMutation, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { ApiKeyTableQuery, graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

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
			title="Delete API key"
			description="Anything using this key will immediately lose authentication"
			confirmText="Delete key"
			confirmVariant="danger"
			isOpen={!!apiKey}
			onClose={onClose}
			onConfirm={handleConfirm}
			confirmIsLoading={isPending}
			trigger={null}
		/>
	)
}
