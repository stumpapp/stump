import { zodResolver } from '@hookform/resolvers/zod'
import { useBookClubsQuery, useCreateBookClub } from '@stump/client'
import { Button, CheckBox, Form, Input, TextArea } from '@stump/components'
import { BookClub, BookClubMemberRoleSpec, CreateBookClub } from '@stump/types'
import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'
import z from 'zod'

import { ContentContainer } from '@/components/container'

import { useLocaleContext } from '../../../i18n'
import paths from '../../../paths'
import CreatorPreferences from './CreatorPreferences'
import RoleMappingForm from './RoleMappingForm'

const memberRoleSpecSchema = z.object({
	ADMIN: z.string().optional(),
	CREATOR: z.string().optional(),
	MEMBER: z.string().optional(),
	MODERATOR: z.string().optional(),
})
const defaultMemberSpec: BookClubMemberRoleSpec = {
	ADMIN: 'Admin',
	CREATOR: 'Creator',
	MEMBER: 'Member',
	MODERATOR: 'Moderator',
}
const buildSchema = (t: (key: string) => string, existingClubs: BookClub[]) =>
	z.object({
		creator_display_name: z.string().optional(),
		creator_hide_progress: z.boolean().default(false).optional(),
		description: z.string().optional(),
		is_private: z.boolean().default(false).optional(),
		member_role_spec: memberRoleSpecSchema.optional(),
		name: z
			.string()
			.min(1, { message: t('createBookClubScene.form.validation.missingName') })
			.refine(
				(value) => existingClubs.every((club) => club.name !== value),
				(value) => ({ message: `${value} is already taken` }),
			),
	})
export type Schema = z.infer<ReturnType<typeof buildSchema>>

const LOCAL_BASE = 'createBookClubScene.form'
export const getLocaleKey = (key: string) => `${LOCAL_BASE}.${key}`

export default function CreateBookClubForm() {
	const navigate = useNavigate()

	const { t } = useLocaleContext()

	const { bookClubs } = useBookClubsQuery({ params: { all: true } })
	const { createBookClub } = useCreateBookClub()

	const schema = useMemo(() => buildSchema(t, bookClubs ?? []), [t, bookClubs])
	const form = useForm<Schema>({
		resolver: zodResolver(schema),
	})
	const is_private = form.watch('is_private')

	const handleSubmit = async (data: Schema) => {
		let member_role_spec: BookClubMemberRoleSpec | null = null
		// if any field of the member role spec is set, we need to set the whole thing
		// with the default values
		const setRoles = Object.values(data.member_role_spec ?? {}).filter(Boolean)
		if (setRoles.length) {
			member_role_spec = {
				...defaultMemberSpec,
				...data.member_role_spec,
			}
		}

		try {
			const payload = {
				...data,
				member_role_spec,
			} as CreateBookClub // null vs undefined type issue, im just lazy
			const createdClub = await createBookClub(payload)
			toast.success('Club created!')
			navigate(paths.bookClub(createdClub.id))
		} catch (error) {
			console.error(error)
			toast.error('Something went wrong')
		}
	}

	return (
		<Form id="create-club-form" form={form} onSubmit={handleSubmit}>
			<ContentContainer>
				<div className="flex flex-col gap-6 md:max-w-md">
					<Input
						variant="primary"
						fullWidth
						label={t(getLocaleKey('name.label'))}
						description={t(getLocaleKey('name.description'))}
						descriptionPosition="top"
						placeholder={t(getLocaleKey('name.placeholder'))}
						autoComplete="off"
						errorMessage={form.formState.errors.name?.message}
						required
						{...form.register('name')}
					/>

					<TextArea
						variant="primary"
						label={t(getLocaleKey('description.label'))}
						description={t(getLocaleKey('description.description'))}
						// TODO: impl this for text area
						// descriptionPosition="top"
						placeholder={t(getLocaleKey('description.placeholder'))}
						autoComplete="off"
						errorMessage={form.formState.errors.description?.message}
						{...form.register('description')}
					/>

					<CheckBox
						id="is_private"
						variant="primary"
						label={t(getLocaleKey('is_private.label'))}
						description={t(getLocaleKey('is_private.description'))}
						checked={is_private}
						onClick={() => form.setValue('is_private', !is_private)}
					/>
				</div>

				<RoleMappingForm />
				<CreatorPreferences />

				<div className="flex w-full md:max-w-sm">
					<Button type="submit" variant="primary" size="lg">
						{t(getLocaleKey('submit'))}
					</Button>
				</div>
			</ContentContainer>
		</Form>
	)
}
