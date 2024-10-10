import { BookClub, BookClubMemberRoleSpec } from '@stump/sdk'
import { z } from 'zod'

import { FORBIDDEN_ENTITY_NAMES } from '@/utils/form'

const memberRoleSpecSchema = z.object({
	ADMIN: z.string().optional(),
	CREATOR: z.string().optional(),
	MEMBER: z.string().optional(),
	MODERATOR: z.string().optional(),
})

export const defaultMemberSpec: BookClubMemberRoleSpec = {
	ADMIN: 'Admin',
	CREATOR: 'Creator',
	MEMBER: 'Member',
	MODERATOR: 'Moderator',
}

const VALIDATION_BASE = 'createOrUpdateBookClubForm.validation'
const getKey = (key: string) => `${VALIDATION_BASE}.${key}`

export const buildSchema = (
	t: (key: string) => string,
	existingClubNames: string[],
	isCreating: boolean,
) =>
	z.object({
		creator_display_name: z.string().optional(),
		creator_hide_progress: isCreating ? z.boolean().default(false) : z.boolean().optional(),
		description: z.string().optional(),
		is_private: z.boolean().default(false),
		member_role_spec: memberRoleSpecSchema.optional(),
		name: z
			.string()
			.min(1, { message: t(getKey('missingName')) })
			.refine(
				(value) => existingClubNames.every((name) => name !== value),
				(value) => ({
					message: `"${value}" ${t(getKey('alreadyTaken'))}`,
				}),
			)
			.refine((value) => !FORBIDDEN_ENTITY_NAMES.includes(value), {
				message: t(getKey('forbiddenName')),
			}),
	})
export type CreateOrUpdateBookClubSchema = z.infer<ReturnType<typeof buildSchema>>

export const formDefaults = (club?: BookClub): CreateOrUpdateBookClubSchema => ({
	creator_display_name: club?.name || '',
	description: '',
	is_private: club?.is_private ?? false,
	member_role_spec: club?.member_role_spec,
	name: club?.name || '',
})
