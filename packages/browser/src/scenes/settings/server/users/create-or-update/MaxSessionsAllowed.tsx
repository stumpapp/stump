import { Input } from '@stump/components'
import { useCallback, useEffect } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import { CreateOrUpdateUserSchema } from './schema'

export default function MaxSessionsAllowed() {
	const form = useFormContext<CreateOrUpdateUserSchema>()
	const { errors } = useFormState({ control: form.control })

	const [maxSessionsAllowed] = form.watch(['maxSessionsAllowed'])

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
			variant="primary"
			label="Max sessions allowed"
			description="The maximum number of valid sessions allowed at a time. If a user tries to log in once this limit is reached, the oldest session will be invalidated."
			type="number"
			name="maxSessionsAllowed"
			value={maxSessionsAllowed}
			errorMessage={errors.maxSessionsAllowed?.message}
			onChange={handleChange}
		/>
	)
}
