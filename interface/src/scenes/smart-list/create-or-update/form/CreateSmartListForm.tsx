import { Form } from '@stump/components'
import React from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

import { ContentContainer } from '@/components/container'

import AccessSettings from './AccessSettings'
import BasicDetails from './BasicDetails'

// TODO: share these form components with the update/settings!!!!!!!!!!!!
export default function CreateSmartListForm() {
	const form = useForm<Schema>({
		defaultValues: {
			visibility: 'PRIVATE',
		},
	})

	const handleSubmit = async (data: Schema) => {
		console.debug('Create smart list', { data })
	}

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<ContentContainer>
				<BasicDetails />

				<AccessSettings />
			</ContentContainer>
		</Form>
	)
}

const schema = z.object({
	description: z.string().optional(),
	name: z.string().min(1),
	visibility: z.union([z.literal('PUBLIC'), z.literal('SHARED'), z.literal('PRIVATE')]),
	// filters:
})

// const filterSchema = z.object({
// 	groups: z.array(filterGroupSchema),
// 	joiner: z.union([z.literal('AND'), z.literal('OR')]),
// })

// // media filter { name: Filter<string> } | { metadata: MediaMetadataSmartFilter } | { series: SeriesSmartFilter }

// // { and: T[] } | { or: T[] } | { not: T[] }
// const andFilterGroupSchema = z.object({
// 	and: z.array(TODO),
// })

export type Schema = z.infer<typeof schema>
export type CreateSmartListForm = UseFormReturn<Schema>
