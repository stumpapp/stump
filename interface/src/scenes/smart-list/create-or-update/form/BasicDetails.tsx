import { Heading, Input, Text, TextArea } from '@stump/components'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { Schema } from './schema'

type SubSchema = Pick<Schema, 'name' | 'description'>

type Props = {
	isUpdate?: boolean
}
export default function BasicDetails({ isUpdate }: Props) {
	const form = useFormContext<SubSchema>()

	return (
		<div className="flex flex-col gap-y-6">
			<div>
				<Heading size="md">Basic details</Heading>
				<Text variant="muted" size="sm">
					{isUpdate ? 'Change' : 'Enter'} the name, description, and other basic details for this
					smart list
				</Text>
			</div>

			<Input
				label="Name"
				variant="primary"
				description={!isUpdate ? 'Must be unique, but can be changed later' : undefined}
				errorMessage={form.formState.errors.name?.message}
				{...form.register('name')}
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
