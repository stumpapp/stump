import { Input, TextArea } from '@stump/components'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { SmartListFormSchema } from './schema'

type SubSchema = Pick<SmartListFormSchema, 'name' | 'description'>

type Props = {
	isUpdate?: boolean
}
export default function BasicDetails({ isUpdate }: Props) {
	const form = useFormContext<SubSchema>()

	return (
		<div className="flex flex-col gap-y-6">
			<Input
				label="Name"
				variant="primary"
				description={!isUpdate ? 'Must be unique, but can be changed later' : undefined}
				errorMessage={form.formState.errors.name?.message}
				{...form.register('name')}
				data-1p-ignore
			/>

			<TextArea
				label="Description"
				variant="primary"
				className="md:w-3/5"
				{...form.register('description')}
			/>
		</div>
	)
}
