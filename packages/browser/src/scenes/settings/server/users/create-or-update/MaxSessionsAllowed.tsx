import { Input } from '@stump/components'
import React, { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { Schema } from './CreateOrUpdateUserForm'

export default function MaxSessionsAllowed() {
	const form = useFormContext<Schema>()

	const [max_sessions_allowed] = form.watch(['max_sessions_allowed'])

	useEffect(
		() => {
			if (max_sessions_allowed == undefined) {
				form.setValue('max_sessions_allowed', undefined)
				form.clearErrors('max_sessions_allowed')
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[max_sessions_allowed],
	)

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = e.target

		if (value === '' || value == undefined) {
			form.setValue('max_sessions_allowed', undefined)
		} else {
			const parsed = parseInt(value)
			if (!isNaN(parsed)) {
				form.setValue('max_sessions_allowed', parsed)
			}
		}
	}

	return (
		<Input
			variant="primary"
			label="Max sessions allowed"
			description="The maximum number of valid sessions allowed at a time. If a user tries to log in once this limit is reached, the oldest session will be invalidated."
			type="number"
			name="max_sessions_allowed"
			value={max_sessions_allowed}
			errorMessage={form.formState.errors.max_sessions_allowed?.message}
			onChange={handleChange}
		/>
	)
}
