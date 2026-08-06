import { Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useEffect } from 'react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'

import { CreateOrUpdateUserSchema } from './schema'

export default function MaxSessionsAllowed() {
	const { t } = useLocaleContext()
	const form = useFormContext<CreateOrUpdateUserSchema>()
	const { errors } = useFormState({ control: form.control })

	const [maxSessionsAllowed] = useWatch({ control: form.control, name: ['maxSessionsAllowed'] })

	useEffect(() => {
		const isSameValue = maxSessionsAllowed === form.getValues('maxSessionsAllowed')
		if (maxSessionsAllowed == undefined && !isSameValue) {
			form.setValue('maxSessionsAllowed', undefined)
			form.clearErrors('maxSessionsAllowed')
		}
	}, [form, maxSessionsAllowed])

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target

			if (value === '' || value == undefined) {
				form.setValue('maxSessionsAllowed', undefined)
			} else {
				const parsed = parseInt(value)
				if (!isNaN(parsed)) {
					form.setValue('maxSessionsAllowed', parsed)
				}
			}
		},
		[form],
	)

	return (
		<Input
			id="maxSessionsAllowed"
			label={t('settingsScene.server/users.createOrUpdateForm.maxSessions.label')}
			description={t('settingsScene.server/users.createOrUpdateForm.maxSessions.description')}
			type="number"
			name="maxSessionsAllowed"
			value={maxSessionsAllowed}
			errorMessage={errors.maxSessionsAllowed?.message}
			onChange={handleChange}
		/>
	)
}
