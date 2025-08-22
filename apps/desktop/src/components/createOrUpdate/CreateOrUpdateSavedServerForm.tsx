import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Input, Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { match, P } from 'ts-pattern'

import { CreateServer, SavedServer } from '../../stores/savedServer'
import { buildSchema, CreateOrUpdateServerSchema } from './schema'

export const CREATE_OR_UPDATE_SERVER_FORM_ID = 'createOrUpdateServerForm'

type Props = {
	editingServer?: SavedServer
	existingServers: SavedServer[]
	onSubmit: (server: CreateServer) => void
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
			url: editingServer?.url || '',
			authMode: 'login',
			isDefault: false,
		} as CreateOrUpdateServerSchema,
		resolver: zodResolver(buildSchema(existingServers, t, editingServer)),
	})
	const { errors } = useFormState({ control: form.control })

	const authMode = form.watch('authMode')

	const handleSubmit = useCallback(
		(data: CreateOrUpdateServerSchema) => {
			const payload: CreateServer = {
				name: data.name,
				url: data.url,
				isDefault: data.isDefault,
				config: {
					auth: match(data)
						.with({ authMode: 'login' }, () => undefined)
						.with({ authMode: 'token', token: P.string }, (token) => ({
							bearer: token.token,
						}))
						.with({ authMode: 'basic', username: P.string, password: P.string }, (creds) => ({
							basic: {
								username: creds.username,
								password: creds.password,
							},
						}))
						.otherwise(() => undefined),
				},
			}
			onSubmit(payload)
		},
		[onSubmit],
	)

	return (
		<Form id={CREATE_OR_UPDATE_SERVER_FORM_ID} form={form} onSubmit={handleSubmit}>
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
				id="url"
				label={t(getKey('uri.label'))}
				description={t(getKey('uri.description'))}
				placeholder={t(getKey('uri.placeholder'))}
				{...form.register('url')}
				errorMessage={errors.url?.message}
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
					<Input
						label="Password"
						fullWidth
						id="password"
						type="password"
						{...form.register('password')}
					/>
				</>
			)}

			{authMode === 'login' && (
				<div className="rounded-lg border border-dashed border-edge p-2">
					<Text variant="muted" size="sm">
						You will occasionally be prompted to log in when you connect to this server
					</Text>
				</div>
			)}
		</Form>
	)
}

const LOCALE_BASE = 'settingsScene.app/desktop.sections.configuredServers.addOrEditServer.fields'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
