import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import React from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import z from 'zod'

import { useFilterContext } from '..'
import AgeRatingFilter from './AgeRatingFilter'
import GenericFilterMultiselect from './GenericFilterMultiselect'
import { removeEmpty } from './utils'

const DEFAULT_STATUS_OPTIONS = [
	{
		label: 'Continuing',
		value: 'continuing',
	},
	{
		label: 'Ended',
		value: 'ended',
	},
]

const schema = z.object({
	metadata: z
		.object({
			age_rating: z
				.number()
				.optional()
				.nullable()
				.refine((val) => val == null || (val >= 0 && val <= 18)),
			meta_type: z.array(z.string()).optional(),
			status: z.array(z.string()).optional(),
		})
		.optional(),
})
export type SeriesFilterFormSchema = z.infer<typeof schema>

export default function SeriesFilterForm() {
	const { filters, setFilters } = useFilterContext()

	const form = useForm({
		defaultValues: {
			metadata: {
				...((filters?.metadata as Record<string, string[]>) || {}),
				age_rating: (filters?.metadata as Record<string, unknown>)?.age_rating ?? null,
			},
		},
		resolver: zodResolver(schema),
	})

	/**
	 * A function that handles the form submission. This function merges the form
	 * values with the existing filters and sets the new filters.
	 * @param values The values from the form.
	 */
	const handleSubmit = (values: FieldValues) => {
		const adjustedValues = removeEmpty(values)
		const merged = {
			...filters,
			...adjustedValues,
			metadata: { ...(filters?.metadata || {}), ...(adjustedValues?.metadata || {}) },
		}
		setFilters(merged)
	}

	return (
		<Form
			className="flex max-h-full grow flex-col overflow-y-auto overflow-x-visible px-6 py-2 scrollbar-hide"
			id="filter-form"
			form={form}
			onSubmit={handleSubmit}
		>
			<GenericFilterMultiselect
				label="Status"
				name="metadata.status"
				options={DEFAULT_STATUS_OPTIONS}
			/>

			<AgeRatingFilter variant="series" />
		</Form>
	)
}
