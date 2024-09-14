import { SMTPEmailer } from '@stump/types'
import { z } from 'zod'

import { FORBIDDEN_ENTITY_NAMES } from '@/utils/form'

const LOCALE_BASE = 'settingsScene.server/email.createOrUpdateForm'

export const createSchema = (
	existingNames: string[],
	t: (key: string) => string,
	isCreating: boolean,
) =>
	z.object({
		is_primary: z.boolean().default(existingNames.length === 0),
		max_attachment_size_bytes: z.number().optional().nullable(),
		name: z
			.string()
			.min(1)
			.refine((name) => !existingNames.includes(name), {
				message: t(`${LOCALE_BASE}.nameAlreadyExists`),
			})
			.refine((name) => !FORBIDDEN_ENTITY_NAMES.includes(name), {
				message: t(`${LOCALE_BASE}.nameIsForbidden`),
			}),
		password: isCreating ? z.string().min(1) : z.string().optional(),
		sender_display_name: z.string().min(1),
		sender_email: z.string().email(),
		smtp_host: z.string().min(1),
		smtp_port: z.number(),
		tls_enabled: z.boolean().default(false),
		username: z.string().min(1),
	})
export type CreateOrUpdateEmailerSchema = z.infer<ReturnType<typeof createSchema>>

export const formDefaults = (emailer?: SMTPEmailer) => ({
	is_primary: emailer?.is_primary || true,
	max_attachment_size_bytes: emailer?.config.max_attachment_size_bytes ?? null,
	name: emailer?.name,
	password: undefined,
	sender_display_name: emailer?.config.sender_display_name,
	sender_email: emailer?.config.sender_email,
	smtp_host: emailer?.config.smtp_host,
	smtp_port: emailer?.config.smtp_port,
	tls_enabled: emailer?.config.tls_enabled || false,
	username: emailer?.config.username,
})
