import { useGraphQLMutation, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { EmailDevicesTableQuery, graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'

const mutation = graphql(`
	mutation DeleteDeviceConfirmationDeleteEmailDevice($id: Int!) {
		deleteEmailDevice(id: $id) {
			id
		}
	}
`)

type RegisteredEmailDevice = EmailDevicesTableQuery['emailDevices'][number]

type Props = {
	device: RegisteredEmailDevice | null
	onClose: () => void
}

export default function DeleteDeviceConfirmation({ device, onClose }: Props) {
	const { sdk } = useSDK()
	const { t } = useTranslate()

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
			toast.error(t('settingsScene.server/email.sections.devices.deleteDevice.toasts.error'))
		},
	})

	const handleConfirm = useCallback(() => {
		if (device) {
			mutate({ id: device.id })
		}
	}, [device, mutate])

	return (
		<ConfirmationModal
			title={t('settingsScene.server/email.sections.devices.deleteDevice.title')}
			description={t('settingsScene.server/email.sections.devices.deleteDevice.description')}
			confirmText={t('settingsScene.server/email.sections.devices.deleteDevice.confirm')}
			confirmVariant="destructive"
			isOpen={!!device}
			onClose={onClose}
			onConfirm={handleConfirm}
			confirmIsLoading={isDeleting}
			trigger={null}
		/>
	)
}
