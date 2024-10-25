import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/sdk'
import { useForm, useFormState } from 'react-hook-form'

import { buildSchema, CreateOrUpdateServerSchema } from './schema'

export const CREATE_OR_UPDATE_SERVER_FORM_ID = 'createOrUpdateServerForm'

type Props = {
	editingServer?: SavedServer
	existingServers: SavedServer[]
	onSubmit: (server: SavedServer) => void
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
		},
		resolver: zodResolver(buildSchema(existingServers, t, editingServer)),
	})
	const { errors } = useFormState({ control: form.control })

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
		</Form>
	)
}

const LOCALE_BASE = 'settingsScene.app/desktop.sections.configuredServers.addOrEditServer.fields'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
