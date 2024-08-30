import { BookClub, BookClubMemberRoleSpec } from '@stump/types'
import { z } from 'zod'

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

export const buildSchema = (t: (key: string) => string, existingClubs: BookClub[]) =>
	z.object({
		creator_display_name: z.string().optional(),
		creator_hide_progress: z.boolean().default(false).optional(),
		description: z.string().optional(),
		is_private: z.boolean().default(false).optional(),
		member_role_spec: memberRoleSpecSchema.optional(),
		name: z
			.string()
			.min(1, { message: t(getKey('missingName')) })
			.refine(
				(value) => existingClubs.every((club) => club.name !== value),
				(value) => ({
					message: `"${value}" ${t(getKey('alreadyTaken'))}`,
				}),
			),
	})
export type CreateOrUpdateBookClubSchema = z.infer<ReturnType<typeof buildSchema>>
