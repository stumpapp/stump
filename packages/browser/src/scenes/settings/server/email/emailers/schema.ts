import { CreateOrUpdateEmailerFormFragment } from '@stump/graphql'
import { z } from 'zod'

import { FORBIDDEN_ENTITY_NAMES } from '@/utils/form'

const LOCALE_BASE = 'settingsScene.server/email.createOrUpdateForm'

export const createSchema = (
	existingNames: string[],
	t: (key: string) => string,
	isCreating: boolean,
) =>
	z.object({
		isPrimary: z.boolean(),
		maxAttachmentSizeBytes: z.number().optional().nullable(),
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
		senderDisplayName: z.string().min(1),
		senderEmail: z.email(),
		smtpHost: z.string().min(1),
		smtpPort: z.number().int().min(1),
		tlsEnabled: z.boolean(),
		username: z.string().min(1),
	})
export type CreateOrUpdateEmailerSchema = z.infer<ReturnType<typeof createSchema>>

export const formDefaults = (
	emailer?: CreateOrUpdateEmailerFormFragment | null,
): CreateOrUpdateEmailerSchema => ({
	isPrimary: emailer?.isPrimary ?? true,
	maxAttachmentSizeBytes: emailer?.maxAttachmentSizeBytes ?? null,
	name: emailer?.name ?? '',
	password: undefined,
	senderDisplayName: emailer?.senderDisplayName ?? '',
	senderEmail: emailer?.senderEmail ?? '',
	smtpHost: emailer?.smtpHost ?? '',
	smtpPort: emailer?.smtpPort ?? 0,
	tlsEnabled: emailer?.tlsEnabled ?? false,
	username: emailer?.username ?? '',
})
