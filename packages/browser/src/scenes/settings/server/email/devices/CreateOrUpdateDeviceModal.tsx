import { zodResolver } from '@hookform/resolvers/zod'
import { Button, CheckBox, Dialog, Form, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { RegisteredEmailDevice } from '@stump/types'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

type Props = {
	isOpen: boolean
	updatingDevice: RegisteredEmailDevice | null
	onClose: () => void
}

// TODO: unique constraint on name...
export default function CreateOrUpdateDeviceModal({ isOpen, updatingDevice, onClose }: Props) {
	const { t } = useLocaleContext()

	const form = useForm({
		defaultValues: updatingDevice
			? {
					email: updatingDevice.email,
					forbidden: updatingDevice.forbidden,
					name: updatingDevice.name,
				}
			: {
					email: '',
					forbidden: false,
					name: '',
				},
		resolver: zodResolver(schema),
	})

	const handleSubmit = (values: z.infer<typeof schema>) => {
		console.debug('submit', values)
	}

	const onOpenChange = (nowOpen: boolean) => (nowOpen ? onClose() : null)

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
					<Form form={form} onSubmit={handleSubmit}>
						<Input
							label={t(getKey('name.label'))}
							description={t(getKey('name.description'))}
							variant="primary"
							{...form.register('name')}
						/>
						<Input
							label={t(getKey('email.label'))}
							description={t(getKey('email.description'))}
							variant="primary"
							{...form.register('email')}
						/>
						<CheckBox
							label={t(getKey('forbidden.label'))}
							description={t(getKey('forbidden.description'))}
							variant="primary"
							{...form.register('forbidden')}
						/>
					</Form>
				</div>

				<Dialog.Footer>
					<Button variant="default" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="primary">
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
