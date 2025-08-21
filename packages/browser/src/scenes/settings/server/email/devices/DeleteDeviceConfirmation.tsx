import { useGraphQLMutation, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { graphql } from '@stump/graphql'
import { RegisteredEmailDevice } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'

const mutation = graphql(`
	mutation DeleteDeviceConfirmationDeleteEmailDevice($id: Int!) {
		deleteEmailDevice(id: $id) {
			id
		}
	}
`)

type Props = {
	device: RegisteredEmailDevice | null
	onClose: () => void
}

export default function DeleteDeviceConfirmation({ device, onClose }: Props) {
	const { sdk } = useSDK()

	const client = useQueryClient()
	const { mutate, isPending: isDeleting } = useGraphQLMutation(mutation, {
		onSuccess: async () => {
			await client.refetchQueries({
				predicate: ({ queryKey: [baseKey] }) => baseKey === sdk.cacheKeys.emailDevices,
			})
			onClose()
		},
		onError: (error) => {
			console.error(error)
			toast.error('Failed to delete device')
		},
	})

	const handleConfirm = useCallback(() => {
		if (device) {
			mutate({ id: device.id })
		}
	}, [device, mutate])

	return (
		<ConfirmationModal
			title="Delete device"
			description="Are you sure you want to delete this device?"
			confirmText="Delete device"
			confirmVariant="danger"
			isOpen={!!device}
			onClose={onClose}
			onConfirm={handleConfirm}
			confirmIsLoading={isDeleting}
			trigger={null}
		/>
	)
}
