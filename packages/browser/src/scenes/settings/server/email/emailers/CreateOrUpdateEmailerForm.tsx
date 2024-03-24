import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form, Heading, Input, Text } from '@stump/components'
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
				}
			: undefined,
		resolver: zodResolver(schema),
	})

	return (
		<Form form={form} onSubmit={onSubmit} fieldsetClassName="space-y-8">
			<Input
				label={t(`${LOCALE_BASE}.name.label`)}
				description={t(`${LOCALE_BASE}.name.description`)}
				variant="primary"
				{...form.register('name')}
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

				<Input
					label={t(`${LOCALE_BASE}.smtpHost.label`)}
					description={t(`${LOCALE_BASE}.smtpHost.description`)}
					variant="primary"
					{...form.register('smtp_host')}
				/>

				<Input
					label={t(`${LOCALE_BASE}.smtpPort.label`)}
					description={t(`${LOCALE_BASE}.smtpPort.description`)}
					variant="primary"
					{...form.register('smtp_port')}
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
				/>

				<Input
					label={t(`${LOCALE_BASE}.senderEmail.label`)}
					description={t(`${LOCALE_BASE}.senderEmail.description`)}
					variant="primary"
					{...form.register('sender_email')}
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
					{...form.register('max_attachment_size_bytes')}
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
	})
export type FormValues = z.infer<ReturnType<typeof createSchema>>
