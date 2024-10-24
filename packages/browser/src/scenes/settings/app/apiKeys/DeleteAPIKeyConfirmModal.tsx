import { queryClient, useMutation, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { APIKey } from '@stump/sdk'
import { useCallback } from 'react'

type Props = {
	apiKey: APIKey | null
	onClose: () => void
}

export default function DeleteAPIKeyConfirmModal({ apiKey, onClose }: Props) {
	const { sdk } = useSDK()
	const { mutate: deleteKey, isLoading: isDeleting } = useMutation(
		[sdk.apiKey.keys.delete],
		(id: number) => sdk.apiKey.delete(id),
		{
			onSuccess: async () => {
				await queryClient.invalidateQueries([sdk.apiKey.keys.get], { exact: false })
				onClose()
			},
		},
	)

	const handleConfirm = useCallback(() => {
		if (apiKey) {
			deleteKey(apiKey.id)
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
			confirmIsLoading={isDeleting}
			trigger={null}
		/>
	)
}
