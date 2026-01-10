import { zodResolver } from '@hookform/resolvers/zod'
import {
	Button,
	CheckBox,
	Form,
	Heading,
	Input,
	Label,
	NativeSelect,
	PasswordInput,
	Text,
} from '@stump/components'
import { EmailerListItemFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useForm, useFormState } from 'react-hook-form'

import { CreateOrUpdateEmailerSchema, createSchema, formDefaults } from './schema'
import { commonHosts, getCommonHost } from './utils'

type Props = {
	emailer?: EmailerListItemFragment
	existingNames: string[]
	onSubmit: (values: CreateOrUpdateEmailerSchema) => void
}

// TODO: Some of the descriptions are LONG. Use tooltips where necessary, instead of inline descriptions.
export default function CreateOrUpdateEmailerForm({ emailer, existingNames, onSubmit }: Props) {
	const { t } = useLocaleContext()

	const schema = useMemo(
		() =>
			createSchema(
				existingNames.filter((n) => n !== emailer?.name),
				t,
				!emailer,
			),
		[t, emailer, existingNames],
	)
	const form = useForm<CreateOrUpdateEmailerSchema>({
		defaultValues: formDefaults(emailer),
		resolver: zodResolver(schema),
	})
	const { errors } = useFormState({ control: form.control })

	const [currentHost, tlsEnabled] = form.watch(['smtpHost', 'tlsEnabled'])

	const presetValue = useMemo(() => getCommonHost(currentHost)?.name.toLowerCase(), [currentHost])

	const numericChangeHandler = useCallback(
		(key: keyof CreateOrUpdateEmailerSchema) => (e: React.ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target

			if (value === '' || value == undefined) {
				form.setValue(key, undefined)
			} else {
				const parsed = parseInt(value)
				if (!isNaN(parsed)) {
					form.setValue(key, parsed)
				}
			}
		},
		[form],
	)

	const numericRegister = useCallback(
		(key: keyof CreateOrUpdateEmailerSchema) => {
			return {
				...form.register(key, { valueAsNumber: true }),
				onChange: numericChangeHandler(key),
			}
		},
		[form, numericChangeHandler],
	)

	return (
		<Form
			data-testid="createOrUpdateEmailerForm"
			form={form}
			onSubmit={onSubmit}
			fieldsetClassName="space-y-8"
		>
			<Input
				id="name"
				label={t(`${LOCALE_BASE}.name.label`)}
				description={t(`${LOCALE_BASE}.name.description`)}
				variant="primary"
				{...form.register('name')}
				errorMessage={errors.name?.message}
				ignoreFill
			/>

			<div className="flex flex-col space-y-4">
				<div>
					<Heading size="sm" className="font-semibold">
						{t(`${LOCALE_BASE}.smtpSettings.heading`)}
					</Heading>

					<Text variant="muted" size="sm">
						{t(`${LOCALE_BASE}.smtpSettings.description`)}
					</Text>
				</div>

				{/* FIXME: A little buggy */}
				<div className="flex flex-col space-y-1 md:max-w-sm">
					<Label>{t(`${LOCALE_BASE}.smtpProvider.label`)}</Label>
					<NativeSelect
						emptyOption={{ label: 'Custom', value: undefined }}
						options={[
							{ label: 'Google', value: 'google' },
							{ label: 'Outlook', value: 'outlook' },
						]}
						value={presetValue}
						onChange={(e) => {
							const value = e.target.value
							if (value && value in commonHosts) {
								const preset = commonHosts[value]
								if (preset) {
									form.setValue('smtpHost', preset.smtpHost)
									form.setValue('smtpPort', preset.smtpPort)
								}
							}
						}}
					/>
					<Text variant="muted" size="sm">
						{t(`${LOCALE_BASE}.smtpProvider.description`)}
					</Text>
				</div>

				<div className="flex flex-col gap-4 md:flex-row md:items-start">
					<Input
						id="smtpHost"
						label={t(`${LOCALE_BASE}.smtpHost.label`)}
						description={t(`${LOCALE_BASE}.smtpHost.description`)}
						variant="primary"
						fullWidth
						{...form.register('smtpHost')}
						errorMessage={errors.smtpHost?.message}
					/>

					<Input
						id="smtpPort"
						label={t(`${LOCALE_BASE}.smtpPort.label`)}
						description={t(`${LOCALE_BASE}.smtpPort.description`)}
						variant="primary"
						className="max-w-[185px]"
						{...numericRegister('smtpPort')}
						errorMessage={errors.smtpPort?.message}
					/>
				</div>

				<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
					<Input
						id="username"
						label={t(`${LOCALE_BASE}.username.label`)}
						description={t(`${LOCALE_BASE}.username.description`)}
						variant="primary"
						{...form.register('username')}
						errorMessage={errors.username?.message}
					/>

					<PasswordInput
						id="password"
						label={t(`${LOCALE_BASE}.password.label`)}
						description={t(`${LOCALE_BASE}.password.description`)}
						variant="primary"
						{...form.register('password')}
						errorMessage={errors.password?.message}
					/>
				</div>

				<CheckBox
					id="tlsEnabled"
					variant="primary"
					label={t(`${LOCALE_BASE}.tlsEnabled.label`)}
					description={t(`${LOCALE_BASE}.tlsEnabled.description`)}
					{...form.register('tlsEnabled')}
					checked={tlsEnabled}
					onClick={() => form.setValue('tlsEnabled', !tlsEnabled)}
				/>
			</div>

			<div className="flex flex-col space-y-4">
				<div>
					<Heading size="sm" className="font-semibold">
						{t(`${LOCALE_BASE}.senderSettings.heading`)}
					</Heading>

					<Text variant="muted" size="sm">
						{t(`${LOCALE_BASE}.senderSettings.description`)}
					</Text>
				</div>
				<Input
					id="senderDisplayName"
					label={t(`${LOCALE_BASE}.senderDisplayName.label`)}
					description={t(`${LOCALE_BASE}.senderDisplayName.description`)}
					variant="primary"
					{...form.register('senderDisplayName')}
					errorMessage={errors.senderDisplayName?.message}
				/>

				<Input
					id="senderEmail"
					label={t(`${LOCALE_BASE}.senderEmail.label`)}
					description={t(`${LOCALE_BASE}.senderEmail.description`)}
					variant="primary"
					{...form.register('senderEmail')}
					errorMessage={errors.senderEmail?.message}
				/>
			</div>

			<div className="flex flex-col space-y-4">
				<div>
					<Heading size="sm" className="font-semibold">
						{t(`${LOCALE_BASE}.additionalSettings.heading`)}
					</Heading>

					<Text variant="muted" size="sm">
						{t(`${LOCALE_BASE}.additionalSettings.description`)}
					</Text>
				</div>

				<Input
					id="maxAttachmentSizeBytes"
					label={t(`${LOCALE_BASE}.maxAttachmentSize.label`)}
					description={t(`${LOCALE_BASE}.maxAttachmentSize.description`)}
					variant="primary"
					{...numericRegister('maxAttachmentSizeBytes')}
					errorMessage={errors.maxAttachmentSizeBytes?.message}
				/>
			</div>

			<div>
				<Button type="submit" variant="primary">
					{t(`${LOCALE_BASE}.submit.${emailer ? 'update' : 'create'}`)}
				</Button>
			</div>
		</Form>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.createOrUpdateForm'
