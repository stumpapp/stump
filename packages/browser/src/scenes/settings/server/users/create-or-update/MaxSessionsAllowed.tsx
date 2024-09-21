import { Input } from '@stump/components'
import React, { useCallback, useEffect } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import { CreateOrUpdateUserSchema } from './schema'

export default function MaxSessionsAllowed() {
	const form = useFormContext<CreateOrUpdateUserSchema>()
	const { errors } = useFormState({ control: form.control })

	const [max_sessions_allowed] = form.watch(['max_sessions_allowed'])

	useEffect(() => {
		const isSameValue = max_sessions_allowed === form.getValues('max_sessions_allowed')
		if (max_sessions_allowed == undefined && !isSameValue) {
			form.setValue('max_sessions_allowed', undefined)
			form.clearErrors('max_sessions_allowed')
		}
	}, [form, max_sessions_allowed])

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target

			if (value === '' || value == undefined) {
				form.setValue('max_sessions_allowed', undefined)
			} else {
				const parsed = parseInt(value)
				if (!isNaN(parsed)) {
					form.setValue('max_sessions_allowed', parsed)
				}
			}
		},
		[form],
	)

	return (
		<Input
			id="max_sessions_allowed"
			variant="primary"
			label="Max sessions allowed"
			description="The maximum number of valid sessions allowed at a time. If a user tries to log in once this limit is reached, the oldest session will be invalidated."
			type="number"
			name="max_sessions_allowed"
			value={max_sessions_allowed}
			errorMessage={errors.max_sessions_allowed?.message}
			onChange={handleChange}
		/>
	)
}
