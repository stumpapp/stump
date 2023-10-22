import { Divider, Heading, Input, Link, Text } from '@stump/components'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { useLocaleContext } from '../../../i18n'
import paths from '../../../paths'
import { getLocaleKey, Schema } from './CreateBookClubForm'

const getMemberKey = (key: string) => getLocaleKey(`member_role_spec.${key}`)

export default function RoleMappingForm() {
	const { t } = useLocaleContext()

	const form = useFormContext<Schema>()

	return (
		<div className="py-2">
			<Heading size="xs">{t('createBookClubScene.form.member_role_spec.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{t('createBookClubScene.form.member_role_spec.subtitle.0')}{' '}
				<Link href={paths.docs('book-club')}>
					{t('createBookClubScene.form.member_role_spec.subtitle.1')}
				</Link>
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="grid grid-cols-1 gap-4 pt-2 md:max-w-3xl md:grid-cols-2">
				<Input
					variant="primary"
					fullWidth
					label={t(getMemberKey('member.label'))}
					description={t(getMemberKey('member.description'))}
					descriptionPosition="top"
					placeholder={t(getMemberKey('member.placeholder'))}
					autoComplete="off"
					errorMessage={form.formState.errors.member_role_spec?.MEMBER?.message}
					{...form.register('member_role_spec.MEMBER')}
				/>

				<Input
					variant="primary"
					fullWidth
					label={t(getMemberKey('moderator.label'))}
					description={t(getMemberKey('moderator.description'))}
					descriptionPosition="top"
					placeholder={t(getMemberKey('moderator.placeholder'))}
					autoComplete="off"
					errorMessage={form.formState.errors.member_role_spec?.MODERATOR?.message}
					{...form.register('member_role_spec.MODERATOR')}
				/>

				<Input
					variant="primary"
					fullWidth
					label={t(getMemberKey('admin.label'))}
					description={t(getMemberKey('admin.description'))}
					descriptionPosition="top"
					placeholder={t(getMemberKey('admin.placeholder'))}
					autoComplete="off"
					errorMessage={form.formState.errors.member_role_spec?.ADMIN?.message}
					{...form.register('member_role_spec.ADMIN')}
				/>

				<Input
					variant="primary"
					fullWidth
					label={t(getMemberKey('creator.label'))}
					description={t(getMemberKey('creator.description'))}
					descriptionPosition="top"
					placeholder={t(getMemberKey('creator.placeholder'))}
					autoComplete="off"
					errorMessage={form.formState.errors.member_role_spec?.CREATOR?.message}
					{...form.register('member_role_spec.CREATOR')}
				/>
			</div>
		</div>
	)
}
