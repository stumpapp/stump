import { zodResolver } from '@hookform/resolvers/zod'
import { SavedServer } from '@stump/client'
import { Form, Input, Label, NativeSelect, Tabs, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useForm, useFormState } from 'react-hook-form'

import { buildSchema, CreateOrUpdateServerSchema } from './schema'

export const CREATE_OR_UPDATE_SERVER_FORM_ID = 'createOrUpdateServerForm'

type Props = {
	editingServer?: SavedServer
	existingServers: SavedServer[]
	onSubmit: (server: Omit<SavedServer, 'id'>) => void
}

export default function CreateOrUpdateSavedServerForm({
	editingServer,
	existingServers,
	onSubmit,
}: Props) {
	const { t } = useLocaleContext()

	const form = useForm<CreateOrUpdateServerSchema>({
		defaultValues: {
			name: editingServer?.name || '',
			uri: editingServer?.uri || '',
			authMode: 'login',
			isDefault: false,
		} as CreateOrUpdateServerSchema,
		resolver: zodResolver(buildSchema(existingServers, t, editingServer)),
	})
	const { errors } = useFormState({ control: form.control })

	const authMode = form.watch('authMode')

	return (
		<Form id={CREATE_OR_UPDATE_SERVER_FORM_ID} form={form} onSubmit={onSubmit}>
			<Input
				fullWidth
				id="name"
				label={t(getKey('name.label'))}
				description={t(getKey('name.description'))}
				placeholder={t(getKey('name.placeholder'))}
				{...form.register('name')}
				errorMessage={errors.name?.message}
			/>

			<Input
				fullWidth
				id="uri"
				label={t(getKey('uri.label'))}
				description={t(getKey('uri.description'))}
				placeholder={t(getKey('uri.placeholder'))}
				{...form.register('uri')}
				errorMessage={errors.uri?.message}
			/>

			<div className="flex flex-col gap-2">
				<Label htmlFor="authMode">Auth method</Label>
				<NativeSelect
					options={[
						{ value: 'login', label: 'Login' },
						{ value: 'token', label: 'Token' },
						{ value: 'basic', label: 'Basic' },
					]}
					onChange={(e) => form.setValue('authMode', e.target.value as 'login' | 'token' | 'basic')}
				/>
			</div>

			{authMode === 'token' && (
				<Input label="Token" fullWidth id="token" {...form.register('token')} />
			)}

			{authMode === 'basic' && (
				<>
					<Input label="Username" fullWidth id="username" {...form.register('username')} />
					<Input label="Password" fullWidth id="password" {...form.register('password')} />
				</>
			)}

			{authMode === 'login' && (
				<div className="rounded-lg border border-dashed border-edge p-2">
					<Text variant="muted" size="sm">
						You will be prompted to log in when you connect to this server
					</Text>
				</div>
			)}
		</Form>
	)
}

const LOCALE_BASE = 'settingsScene.app/desktop.sections.configuredServers.addOrEditServer.fields'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
