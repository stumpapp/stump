import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, CheckBox, Dialog, Form, Input } from '@stump/components'
import { EmailDevicesTableQuery, graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const createMutation = graphql(`
	mutation CreateOrUpdateDeviceModalCreateEmailDevice($input: EmailDeviceInput!) {
		createEmailDevice(input: $input) {
			id
			name
		}
	}
`)

const updateMutation = graphql(`
	mutation CreateOrUpdateDeviceModalUpdateEmailDevice($id: Int!, $input: EmailDeviceInput!) {
		updateEmailDevice(id: $id, input: $input) {
			id
			name
			forbidden
		}
	}
`)

type RegisteredEmailDevice = EmailDevicesTableQuery['emailDevices'][number]

type Props = {
	isOpen: boolean
	updatingDevice: RegisteredEmailDevice | null
	onClose: () => void
}

// TODO: unique constraint on name...
// TODO: fix types here
export default function CreateOrUpdateDeviceModal({ isOpen, updatingDevice, onClose }: Props) {
	const { sdk } = useSDK()
	const { t } = useLocaleContext()

	const client = useQueryClient()

	const { mutate: create } = useGraphQLMutation(createMutation, {
		onSuccess: async () => {
			await client.refetchQueries({
				predicate: ({ queryKey: [baseKey] }) => baseKey === sdk.cacheKeys.emailDevices,
			})
			onClose()
		},
	})

	const { mutate: update } = useGraphQLMutation(updateMutation, {
		onSuccess: async () => {
			client.setQueryData(sdk.cacheKey('emailDevices'), (oldData: EmailDevicesTableQuery) => {
				return {
					...oldData,
					emailDevices: oldData.emailDevices.map((device) =>
						device.id === updatingDevice?.id ? { ...device, ...updatingDevice } : device,
					),
				}
			})
			onClose()
		},
	})

	const defaultValues = useMemo(
		() => ({
			email: updatingDevice?.email || '',
			forbidden: updatingDevice?.forbidden || false,
			name: updatingDevice?.name || '',
		}),
		[updatingDevice],
	)

	const form = useForm({
		defaultValues,
		resolver: zodResolver(schema),
	})
	const { reset } = form

	const isForbidden = form.watch('forbidden')

	useEffect(() => {
		reset(defaultValues)
	}, [defaultValues, reset, updatingDevice])

	const handleSubmit = useCallback(
		(values: z.infer<typeof schema>) => {
			if (updatingDevice) {
				update({
					id: updatingDevice.id,
					input: values,
				})
			} else {
				create({ input: values })
			}
		},
		[updatingDevice, create, update],
	)

	const onOpenChange = (nowOpen: boolean) => (!nowOpen ? onClose() : null)

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>
						{t(updatingDevice ? getKey('title.update') : getKey('title.create'))}
					</Dialog.Title>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>
				<div className="flex flex-col gap-y-2 py-2 scrollbar-hide">
					<Form form={form} onSubmit={handleSubmit} id="create-or-update-device-form">
						<Input
							label={t(getKey('name.label'))}
							description={t(getKey('name.description'))}
							variant="primary"
							{...form.register('name')}
							ignoreFill
						/>
						<Input
							label={t(getKey('email.label'))}
							description={t(getKey('email.description'))}
							variant="primary"
							{...form.register('email')}
							ignoreFill
						/>
						<CheckBox
							label={t(getKey('forbidden.label'))}
							description={t(getKey('forbidden.description'))}
							variant="primary"
							checked={isForbidden}
							onClick={() => form.setValue('forbidden', !isForbidden)}
						/>
					</Form>
				</div>

				<Dialog.Footer>
					<Button variant="default" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="primary" type="submit" form="create-or-update-device-form">
						{t(updatingDevice ? getKey('submit.update') : getKey('submit.create'))}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const schema = z.object({
	email: z.string().email(),
	forbidden: z.boolean().default(false),
	name: z.string(),
})

const LOCALE_BASE = 'settingsScene.server/email.sections.devices.addOrUpdateDevice'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
