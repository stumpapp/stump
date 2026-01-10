import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { SeriesFilterInput } from '@stump/graphql'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useSeriesFilterContext } from '../context'
import AgeRatingFilter from './AgeRatingFilter'
import GenericFilterMultiselect from './GenericFilterMultiselect'

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
			ageRating: z
				.number()
				.optional()
				.nullable()
				.refine((val) => val == null || (val >= 0 && val <= 18)),
			metaType: z.array(z.string()).optional(),
			status: z.array(z.string()).optional(),
		})
		.optional(),
})
export type SeriesFilterFormSchema = z.infer<typeof schema>

export default function SeriesFilterForm() {
	const { filters, setFilters } = useSeriesFilterContext()

	const defaultValues = useMemo(
		() =>
			({
				metadata: {
					ageRating: filters?.metadata?.ageRating?.gte ?? null,
					metaType: filters?.metadata?.metaType?.likeAnyOf ?? [],
					status: filters?.metadata?.status?.likeAnyOf ?? [],
				},
			}) satisfies SeriesFilterFormSchema,
		[filters],
	)

	const form = useForm({
		defaultValues,
		resolver: zodResolver(schema),
	})

	/**
	 * A function that handles the form submission. This function merges the form
	 * values with the existing filters and sets the new filters.
	 * @param values The values from the form.
	 */
	const handleSubmit = (values: SeriesFilterFormSchema) => {
		const adjustedValues = intoGraphql(values)
		const merged = {
			...filters,
			...adjustedValues,
			metadata: { ...(filters?.metadata || {}), ...adjustedValues.metadata },
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

const intoGraphql = (values: SeriesFilterFormSchema) =>
	({
		metadata: {
			ageRating: values.metadata?.ageRating
				? {
						gte: values.metadata.ageRating,
					}
				: undefined,
			metaType: values.metadata?.metaType
				? {
						likeAnyOf: values.metadata.metaType,
					}
				: undefined,
			status: values.metadata?.status
				? {
						likeAnyOf: values.metadata.status,
					}
				: undefined,
		},
	}) as SeriesFilterInput
