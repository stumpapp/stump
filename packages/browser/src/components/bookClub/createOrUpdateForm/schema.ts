import { BookClubLayoutQuery } from '@stump/graphql'
import { BookClubMemberRoleSpec } from '@stump/sdk'
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
		creatorDisplayName: z.string().optional(),
		creatorHideProgress: isCreating ? z.boolean().default(false) : z.boolean().optional(),
		description: z.string().optional(),
		isPrivate: z.boolean().default(false),
		memberRoleSpec: memberRoleSpecSchema.optional(),
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
		slug: z.string().nullish(),
	})
export type CreateOrUpdateBookClubSchema = z.infer<ReturnType<typeof buildSchema>>

export const formDefaults = (
	club?: NonNullable<BookClubLayoutQuery['bookClubBySlug']>,
): CreateOrUpdateBookClubSchema => ({
	creatorDisplayName: club?.name || '',
	description: '',
	isPrivate: club?.isPrivate ?? false,
	memberRoleSpec: club?.roleSpec,
	name: club?.name || '',
})
