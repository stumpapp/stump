import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Input } from '@stump/components'
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
		<Form form={form} onSubmit={onSubmit}>
			<Input
				label={t(`${LOCALE_BASE}.name.label`)}
				description={t(`${LOCALE_BASE}.name.description`)}
				variant="primary"
				{...form.register('name')}
			/>
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
