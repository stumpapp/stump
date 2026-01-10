import { UpdateUserInput, UserPermission } from '@stump/graphql'
import { z } from 'zod'

export const userPermissionSchema = z.nativeEnum(UserPermission)

export interface ExistingUser extends UpdateUserInput {
	id: string
}

export const buildSchema = (
	t: (key: string) => string,
	existingUsernames: string[],
	editingUser?: ExistingUser,
) =>
	z.object({
		ageRestriction: z
			.number()
			.optional()
			.refine((value) => value == undefined || value >= 0, {
				message: t('settingsScene.server/users.createOrUpdateForm.validation.ageRestrictionTooLow'),
			}),
		ageRestrictionOnUnset: z.boolean().optional(),
		forbiddenTags: z.array(z.string()).optional(),
		maxSessionsAllowed: z
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
					existingUsernames.every((username) => username.toLowerCase() !== value.toLowerCase()),
				() => ({
					message: t(
						'settingsScene.server/users.createOrUpdateForm.validation.usernameAlreadyExists',
					),
				}),
			)
			.default(editingUser?.username ?? ''),
	})
export type CreateOrUpdateUserSchema = z.infer<ReturnType<typeof buildSchema>>

export const formDefaults = (editingUser?: ExistingUser): CreateOrUpdateUserSchema => ({
	ageRestriction: editingUser?.ageRestriction?.age,
	ageRestrictionOnUnset: editingUser?.ageRestriction?.restrictOnUnset,
	maxSessionsAllowed: editingUser?.maxSessionsAllowed ?? undefined,
	permissions: editingUser?.permissions ?? [],
	username: editingUser?.username ?? '',
})
