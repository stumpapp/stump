import { CheckBox, Heading, Input, Text } from '@stump/components'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { useLocaleContext } from '../../../i18n'
import { getLocaleKey, Schema } from './CreateBookClubForm'

const getKey = (key: string) => getLocaleKey(`creator_preferences.${key}`)

export default function CreatorPreferences() {
	const { t } = useLocaleContext()

	const form = useFormContext<Schema>()
	const creator_hide_progress = form.watch('creator_hide_progress')

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-1.5">
				<Heading size="xs">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('subtitle'))}
				</Text>
			</div>

			<div className="flex flex-col gap-4 pt-2 md:max-w-lg">
				<Input
					variant="primary"
					fullWidth
					label={t(getKey('creator_display_name.label'))}
					description={t(getKey('creator_display_name.description'))}
					descriptionPosition="top"
					placeholder={t(getKey('creator_display_name.placeholder'))}
					autoComplete="off"
					errorMessage={form.formState.errors.creator_display_name?.message}
					{...form.register('creator_display_name')}
				/>

				<CheckBox
					id="creator_hide_progress"
					variant="primary"
					label={t(getKey('creator_hide_progress.label'))}
					description={t(getKey('creator_hide_progress.description'))}
					checked={creator_hide_progress}
					onClick={() => form.setValue('creator_hide_progress', !creator_hide_progress)}
				/>
			</div>
		</div>
	)
}
