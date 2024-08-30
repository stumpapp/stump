import { CheckBox, Heading, Input, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateBookClubSchema } from './schema'

const LOCALE_KEY = 'createOrUpdateBookClubForm.fields.membershipOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export default function CreatorPreferences() {
	const { t } = useLocaleContext()

	const form = useFormContext<CreateOrUpdateBookClubSchema>()
	const creator_hide_progress = form.watch('creator_hide_progress')

	return (
		<div className="flex flex-col gap-4 pt-2 md:max-w-lg">
			<Input
				variant="primary"
				fullWidth
				label={t(getKey('displayName.label'))}
				description={t(getKey('displayName.description'))}
				descriptionPosition="top"
				placeholder={t(getKey('displayName.placeholder'))}
				autoComplete="off"
				errorMessage={form.formState.errors.creator_display_name?.message}
				{...form.register('creator_display_name')}
			/>

			<CheckBox
				id="creator_hide_progress"
				variant="primary"
				label={t(getKey('hideProgress.label'))}
				description={t(getKey('hideProgress.description'))}
				checked={creator_hide_progress}
				onClick={() => form.setValue('creator_hide_progress', !creator_hide_progress)}
			/>
		</div>
	)
}
