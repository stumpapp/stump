import { User } from '@stump/sdk'
import { z } from 'zod'

export const allPermissions = [
	'bookclub:read',
	'bookclub:create',
	'email:arbitrary_send',
	'email:send',
	'emailer:create',
	'emailer:manage',
	'emailer:read',
	'file:explorer',
	'file:upload',
	'file:download',
	'library:create',
	'library:edit',
	'library:scan',
	'library:manage',
	'library:delete',
	'user:read',
	'user:manage',
	'server:manage',
	'smartlist:read',
	'notifier:read',
	'notifier:create',
	'notifier:delete',
	'notifier:manage',
] as const
export const userPermissionSchema = z.enum(allPermissions)

export const buildSchema = (
	t: (key: string) => string,
	existingUsers: User[],
	editingUser?: User,
) =>
	z.object({
		age_restriction: z
			.number()
			.optional()
			.refine((value) => value == undefined || value >= 0, {
				message: t('settingsScene.server/users.createOrUpdateForm.validation.ageRestrictionTooLow'),
			}),
		age_restriction_on_unset: z.boolean().optional(),
		forbidden_tags: z.array(z.string()).optional(),
		max_sessions_allowed: z
			.number()
			.optional()
			.refine((value) => value == undefined || value >= 0, {
				message: t(
					'settingsScene.server/users.createOrUpdateForm.validation.maxSessionsAllowedTooLow',
				),
			}),
		password: z
			.string()
			// .min(1, { message: t('authScene.form.validation.missingPassword') })
			.optional()
			.refine(
				// if we are updating a user, we don't need to validate the password
				(value) => !!editingUser || !!value,
				() => ({ message: t('authScene.form.validation.missingPassword') }),
			),
		permissions: z
			.array(userPermissionSchema)
			.optional()
			.default(editingUser?.permissions ?? []),
		username: z
			.string()
			.min(1, { message: t('authScene.form.validation.missingUsername') })
			.refine(
				(value) =>
					(!!editingUser && value === editingUser.username) ||
					existingUsers.every((user) => user.username !== value),
				() => ({
					message: t(
						'settingsScene.server/users.createOrUpdateForm.validation.usernameAlreadyExists',
					),
				}),
			)
			.default(editingUser?.username ?? ''),
	})
export type CreateOrUpdateUserSchema = z.infer<ReturnType<typeof buildSchema>>

export const formDefaults = (editingUser?: User): CreateOrUpdateUserSchema => ({
	age_restriction: editingUser?.age_restriction?.age,
	age_restriction_on_unset: editingUser?.age_restriction?.restrict_on_unset,
	max_sessions_allowed: editingUser?.max_sessions_allowed ?? undefined,
	permissions: editingUser?.permissions ?? [],
	username: editingUser?.username ?? '',
})
