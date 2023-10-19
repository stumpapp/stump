import { zodResolver } from '@hookform/resolvers/zod'
import { useBookClubsQuery } from '@stump/client'
import { Form, Input, TextArea } from '@stump/components'
import { BookClub } from '@stump/types'
import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useLocaleContext } from '../../../i18n'

const memberRoleSpecSchema = z.object({
	ADMIN: z.string(),
	CREATOR: z.string(),
	MEMBER: z.string(),
	MODERATOR: z.string(),
})
const buildSchema = (t: (key: string) => string, existingClubs: BookClub[]) =>
	z.object({
		creator_display_name: z.string().optional(),
		creator_hide_progress: z.boolean().default(false),
		description: z.string().optional(),
		is_private: z.boolean().default(false),
		member_role_spec: memberRoleSpecSchema.optional(),
		name: z
			.string()
			.min(1, { message: t('createBookClubScene.form.validation.missingName') })
			.refine(
				(value) => existingClubs.every((club) => club.name !== value),
				(value) => ({ message: `${value} is already taken` }),
			),
	})
type Schema = z.infer<ReturnType<typeof buildSchema>>

const LOCAL_BASE = 'createBookClubScene.form'
const getLocaleKey = (key: string) => `${LOCAL_BASE}.${key}`

export default function CreateBookClubForm() {
	const { t } = useLocaleContext()
	const { bookClubs } = useBookClubsQuery({ params: { all: true } })

	const schema = useMemo(() => buildSchema(t, bookClubs ?? []), [t, bookClubs])
	const form = useForm<Schema>({
		resolver: zodResolver(schema),
	})

	const handleSubmit = async (data: Schema) => {}

	return (
		<Form id="create-club-form" form={form} onSubmit={handleSubmit} className="py-4">
			<div className="flex flex-col gap-4 pb-4 pt-1 md:max-w-md">
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
					required
					{...form.register('description')}
				/>
			</div>
		</Form>
	)
}
