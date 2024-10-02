import { invalidateQueries, useDeleteEmailDevice, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { isAxiosError } from '@stump/sdk'
import { RegisteredEmailDevice } from '@stump/types'
import React, { useCallback } from 'react'
import toast from 'react-hot-toast'

type Props = {
	device: RegisteredEmailDevice | null
	onClose: () => void
}

export default function DeleteDeviceConfirmation({ device, onClose }: Props) {
	const { sdk } = useSDK()
	const { removeAsync, isDeleting } = useDeleteEmailDevice()

	const handleConfirm = useCallback(async () => {
		if (!device) return

		try {
			await removeAsync(device.id)
			await invalidateQueries({ keys: [sdk.emailer.keys.getDevices] })
			onClose()
		} catch (err) {
			console.error(err)

			if (isAxiosError(err)) {
				toast.error(err.message || 'An error occurred while deleting the list')
			} else {
				toast.error('An error occurred while deleting the list')
			}
		}
	}, [onClose, device, removeAsync, sdk.emailer])

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
