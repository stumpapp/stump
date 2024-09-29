import { Form } from '@stump/components'
import React from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'

import { ContentContainer } from '@/components/container'

import AccessSettings from './AccessSettings'
import BasicDetails from './BasicDetails'
import FilterConfiguration from './FilterConfiguration'
import { Schema } from './schema'

export default function CreateSmartListForm() {
	const form = useForm<Schema>({
		defaultValues: {
			filters: {
				groups: [
					{
						filters: [
							// {
							// 	name: 'test-1',
							// },
							// {
							// 	name: 'test-2',
							// },
						],
						joiner: 'and',
					},
				],
				joiner: 'AND',
			},
			visibility: 'PRIVATE',
		},
	})

	const handleSubmit = async (data: Schema) => {
		console.debug('Create smart list', { data })
	}

	console.log('render')

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<ContentContainer>
				<BasicDetails />
				<FilterConfiguration />
				<AccessSettings />
			</ContentContainer>
		</Form>
	)
}

export type CreateSmartListForm = UseFormReturn<Schema>
