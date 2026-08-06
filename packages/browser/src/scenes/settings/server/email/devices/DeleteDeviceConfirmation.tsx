import { useGraphQLMutation, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { EmailDevicesTableQuery, graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
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

type RegisteredEmailDevice = EmailDevicesTableQuery['emailDevices'][number]

type Props = {
	device: RegisteredEmailDevice | null
	onClose: () => void
}

export default function DeleteDeviceConfirmation({ device, onClose }: Props) {
	const { t } = useLocaleContext()
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
			toast.error(t('settingsUi.deleteDeviceError'))
		},
	})

	const handleConfirm = useCallback(() => {
		if (device) {
			mutate({ id: device.id })
		}
	}, [device, mutate])

	return (
		<ConfirmationModal
			title={t('settingsUi.deleteDevice')}
			description={t('settingsUi.deleteDeviceDescription')}
			confirmText={t('settingsUi.deleteDevice')}
			confirmVariant="destructive"
			isOpen={!!device}
			onClose={onClose}
			onConfirm={handleConfirm}
			confirmIsLoading={isDeleting}
			trigger={null}
		/>
	)
}
