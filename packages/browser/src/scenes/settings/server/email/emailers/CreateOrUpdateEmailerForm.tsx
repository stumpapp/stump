import { zodResolver } from '@hookform/resolvers/zod'
import {
	Button,
	Form,
	Heading,
	Input,
	Label,
	NativeSelect,
	PasswordInput,
	Text,
} from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SMTPEmailer } from '@stump/types'
import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

type Props = {
	emailer?: SMTPEmailer
	existingNames: string[]
	onSubmit: (values: FormValues) => void
}

// TODO: Some of the descriptions are LONG. Use tooltips where necessary, instead of inline descriptions.
export default function CreateOrUpdateEmailerForm({ emailer, existingNames, onSubmit }: Props) {
	const { t } = useLocaleContext()

	const schema = useMemo(
		() =>
			createSchema(
				existingNames.filter((n) => n !== emailer?.name),
				t,
				!!emailer,
			),
		[t, emailer, existingNames],
	)
	const form = useForm<FormValues>({
		defaultValues: emailer
			? {
					is_primary: emailer.is_primary,
					max_attachment_size_bytes: emailer.config.max_attachment_size_bytes,
					name: emailer.name,
					sender_display_name: emailer.config.sender_display_name,
					sender_email: emailer.config.sender_email,
					smtp_host: emailer.config.smtp_host,
					smtp_port: emailer.config.smtp_port,
					username: emailer.config.username,
				}
			: undefined,
		resolver: zodResolver(schema),
	})

	const errors = useMemo(() => form.formState.errors, [form.formState.errors])

	const currentHost = form.watch('smtp_host')
	const presetValue = useMemo(
		() => (!!currentHost && currentHost in presets ? currentHost : undefined),
		[currentHost],
	)

	const numericChangeHandler =
		(key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target

			if (value === '' || value == undefined) {
				form.setValue(key, undefined)
			} else {
				const parsed = parseInt(value)
				if (!isNaN(parsed)) {
					form.setValue(key, parsed)
				}
			}
		}
	const numericRegister = (key: keyof FormValues) => {
		return {
			...form.register(key, { valueAsNumber: true }),
			onChange: numericChangeHandler(key),
		}
	}

	return (
		<Form form={form} onSubmit={onSubmit} fieldsetClassName="space-y-8">
			<Input
				label={t(`${LOCALE_BASE}.name.label`)}
				description={t(`${LOCALE_BASE}.name.description`)}
				variant="primary"
				{...form.register('name')}
				errorMessage={errors.name?.message}
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
							if (value && value in presets) {
								const preset = presets[value as keyof typeof presets]
								form.setValue('smtp_host', preset.smtp_host)
								form.setValue('smtp_port', preset.smtp_port)
							}
						}}
					/>
					<Text variant="muted" size="sm">
						{t(`${LOCALE_BASE}.smtpProvider.description`)}
					</Text>
				</div>

				<Input
					label={t(`${LOCALE_BASE}.smtpHost.label`)}
					description={t(`${LOCALE_BASE}.smtpHost.description`)}
					variant="primary"
					{...form.register('smtp_host')}
					errorMessage={errors.smtp_host?.message}
				/>

				<Input
					label={t(`${LOCALE_BASE}.smtpPort.label`)}
					description={t(`${LOCALE_BASE}.smtpPort.description`)}
					variant="primary"
					{...numericRegister('smtp_port')}
					errorMessage={errors.smtp_port?.message}
				/>

				<Input
					label={t(`${LOCALE_BASE}.username.label`)}
					description={t(`${LOCALE_BASE}.username.description`)}
					variant="primary"
					{...form.register('username')}
					errorMessage={errors.username?.message}
				/>

				<PasswordInput
					label={t(`${LOCALE_BASE}.password.label`)}
					description={t(`${LOCALE_BASE}.password.description`)}
					variant="primary"
					{...form.register('password')}
					errorMessage={errors.password?.message}
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
					label={t(`${LOCALE_BASE}.senderDisplayName.label`)}
					description={t(`${LOCALE_BASE}.senderDisplayName.description`)}
					variant="primary"
					{...form.register('sender_display_name')}
					errorMessage={errors.sender_display_name?.message}
				/>

				<Input
					label={t(`${LOCALE_BASE}.senderEmail.label`)}
					description={t(`${LOCALE_BASE}.senderEmail.description`)}
					variant="primary"
					{...form.register('sender_email')}
					errorMessage={errors.sender_email?.message}
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
					label={t(`${LOCALE_BASE}.maxAttachmentSize.label`)}
					description={t(`${LOCALE_BASE}.maxAttachmentSize.description`)}
					variant="primary"
					{...numericRegister('max_attachment_size_bytes')}
					errorMessage={errors.max_attachment_size_bytes?.message}
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
const FORBIDDEN_NAMES = ['new']

const createSchema = (existingNames: string[], _t: (key: string) => string, isCreating: boolean) =>
	z.object({
		is_primary: z.boolean().default(existingNames.length === 0),
		max_attachment_size_bytes: z.number().optional(),
		name: z.string().refine(
			(name) => {
				if (existingNames.includes(name)) {
					return _t(`${LOCALE_BASE}.nameAlreadyExists`)
				} else if (FORBIDDEN_NAMES.includes(name)) {
					return _t(`${LOCALE_BASE}.nameIsForbidden`)
				}
				return true
			},
			{ message: _t(`${LOCALE_BASE}.validation.nameAlreadyExists`) },
		),
		password: isCreating ? z.string() : z.string().optional(),
		sender_display_name: z.string(),
		sender_email: z.string().email(),
		smtp_host: z.string(),
		smtp_port: z.number(),
		username: z.string(),
	})
export type FormValues = z.infer<ReturnType<typeof createSchema>>

const presets = {
	google: {
		smtp_host: 'smtp.gmail.com',
		smtp_port: 587,
	},
	outlook: {
		smtp_host: 'smtp.office365.com',
		smtp_port: 587,
	},
}
