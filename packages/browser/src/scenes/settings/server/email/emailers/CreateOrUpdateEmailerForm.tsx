import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form, NativeSelect, NewCard, PasswordInput } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { useForm, useFormState, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

import { CreateOrUpdateEmailerSchema, createSchema, formDefaults } from './schema'
import TestEmailerButton from './TestEmailerButton'
import { commonHosts, getCommonHost } from './utils'

export const CreateOrUpdateEmailerFormFragment = graphql(`
	fragment CreateOrUpdateEmailerForm on Emailer {
		name
		isPrimary
		smtpHost
		smtpPort
		maxAttachmentSizeBytes
		senderDisplayName
		senderEmail
		tlsEnabled
		username
	}
`)

type Props = {
	emailer?: FragmentType<typeof CreateOrUpdateEmailerFormFragment>
	existingNames: string[]
	onSubmit: (values: CreateOrUpdateEmailerSchema) => void
}

// TODO: Some of the descriptions are LONG. Use tooltips where necessary, instead of inline descriptions.
export default function CreateOrUpdateEmailerForm({
	emailer: fragment,
	existingNames,
	onSubmit,
}: Props) {
	const emailer = useFragment(CreateOrUpdateEmailerFormFragment, fragment)
	const { t } = useTranslate()

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

	const [currentHost, tlsEnabled] = useWatch({
		control: form.control,
		name: ['smtpHost', 'tlsEnabled'],
	})

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
			<NewCard
				label={t(`${LOCALE_BASE}.smtpSettings.heading`)}
				description={t(`${LOCALE_BASE}.smtpSettings.description`)}
				actions={
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
						size="sm"
					/>
				}
			>
				<NewCard.InputRow
					id="smtpHost"
					label={t(`${LOCALE_BASE}.smtpHost.label`)}
					description={t(`${LOCALE_BASE}.smtpHost.description`)}
					{...form.register('smtpHost')}
					errorMessage={errors.smtpHost?.message}
				/>

				<NewCard.InputRow
					id="smtpPort"
					label={t(`${LOCALE_BASE}.smtpPort.label`)}
					description={t(`${LOCALE_BASE}.smtpPort.description`)}
					className="max-w-46.25 lg:ml-auto"
					{...numericRegister('smtpPort')}
					errorMessage={errors.smtpPort?.message}
				/>

				<NewCard.InputRow
					id="username"
					label={t(`${LOCALE_BASE}.username.label`)}
					description={t(`${LOCALE_BASE}.username.description`)}
					{...form.register('username')}
					errorMessage={errors.username?.message}
				/>

				<NewCard.Row
					label={t(`${LOCALE_BASE}.password.label`)}
					description={t(`${LOCALE_BASE}.password.description`)}
				>
					<PasswordInput
						id="password"
						{...form.register('password')}
						errorMessage={errors.password?.message}
						containerClassName="lg:max-w-1/2 max-w-full"
					/>
				</NewCard.Row>

				<NewCard.CheckboxRow
					id="tlsEnabled"
					label={t(`${LOCALE_BASE}.tlsEnabled.label`)}
					description={t(`${LOCALE_BASE}.tlsEnabled.description`)}
					{...form.register('tlsEnabled')}
					checked={tlsEnabled}
					onClick={() => form.setValue('tlsEnabled', !tlsEnabled)}
				/>
			</NewCard>

			<NewCard
				label={t(`${LOCALE_BASE}.senderSettings.heading`)}
				description={t(`${LOCALE_BASE}.senderSettings.description`)}
			>
				<NewCard.InputRow
					id="senderDisplayName"
					label={t(`${LOCALE_BASE}.senderDisplayName.label`)}
					description={t(`${LOCALE_BASE}.senderDisplayName.description`)}
					{...form.register('senderDisplayName')}
					errorMessage={errors.senderDisplayName?.message}
				/>

				<NewCard.InputRow
					id="senderEmail"
					label={t(`${LOCALE_BASE}.senderEmail.label`)}
					description={t(`${LOCALE_BASE}.senderEmail.description`)}
					{...form.register('senderEmail')}
					errorMessage={errors.senderEmail?.message}
				/>
			</NewCard>

			<NewCard
				label={t(`${LOCALE_BASE}.additionalSettings.heading`)}
				description={t(`${LOCALE_BASE}.additionalSettings.description`)}
			>
				<NewCard.InputRow
					id="name"
					label={t(`${LOCALE_BASE}.name.label`)}
					description={t(`${LOCALE_BASE}.name.description`)}
					{...form.register('name')}
					errorMessage={errors.name?.message}
					ignoreFill
				/>

				<NewCard.InputRow
					id="maxAttachmentSizeBytes"
					label={t(`${LOCALE_BASE}.maxAttachmentSize.label`)}
					description={t(`${LOCALE_BASE}.maxAttachmentSize.description`)}
					{...numericRegister('maxAttachmentSizeBytes')}
					errorMessage={errors.maxAttachmentSizeBytes?.message}
				/>
			</NewCard>

			<TestEmailerButton />

			<div className="flex justify-end">
				<Button type="submit">{t(`${LOCALE_BASE}.submit.${emailer ? 'update' : 'create'}`)}</Button>
			</div>
		</Form>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.createOrUpdateForm'
