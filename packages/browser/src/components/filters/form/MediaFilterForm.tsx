import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useSDK } from '@stump/client'
import { CheckBox, Form } from '@stump/components'
import { MediaMetadataFilter } from '@stump/types'
import React, { useEffect, useMemo, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import z from 'zod'

import { useSeriesContextSafe } from '@/scenes/series'

import { useFilterContext } from '..'
import AgeRatingFilter from './AgeRatingFilter'
import ExtensionSelect from './ExtensionSelect'
import GenericFilterMultiselect from './GenericFilterMultiselect'
import ReadStatusSelect from './ReadStatusSelect'
import { removeEmpty } from './utils'

const schema = z.object({
	extension: z.string().optional(),
	metadata: z
		.object({
			age_rating: z
				.number()
				.optional()
				.nullable()
				.refine((val) => val == null || (val >= 0 && val <= 18)),
			character: z.array(z.string()).optional(),
			colorist: z.array(z.string()).optional(),
			editor: z.array(z.string()).optional(),
			genre: z.array(z.string()).optional(),
			inker: z.array(z.string()).optional(),
			letterer: z.array(z.string()).optional(),
			penciller: z.array(z.string()).optional(),
			publisher: z.array(z.string()).optional(),
			writer: z.array(z.string()).optional(),
		})
		.optional(),
	read_status: z.array(z.enum(['completed', 'reading', 'unread'])).optional(),
})
export type MediaFilterFormSchema = z.infer<typeof schema>
type ReadStatus = NonNullable<Pick<MediaFilterFormSchema, 'read_status'>['read_status']>[number]

export default function MediaFilterForm() {
	const { sdk } = useSDK()
	const { filters, setFilters } = useFilterContext()

	const seriesContext = useSeriesContextSafe()
	const [onlyFromSeries, setOnlyFromSeries] = useState(false)

	const params = useMemo(() => {
		if (onlyFromSeries && !!seriesContext?.series.id) {
			return {
				media: {
					series: {
						id: [seriesContext.series.id],
					},
				},
			} satisfies MediaMetadataFilter
		}
		return undefined
	}, [onlyFromSeries, seriesContext])

	const { data } = useQuery([sdk.metadata.keys.overview, params], () =>
		sdk.metadata.overview(params),
	)

	const form = useForm({
		defaultValues: {
			extension: filters?.extension as string,
			metadata: {
				...((filters?.metadata as Record<string, string[]>) || {}),
				age_rating: (filters?.metadata as Record<string, unknown>)?.age_rating ?? null,
			},
			read_status: filters?.read_status as ReadStatus[],
		},
		resolver: zodResolver(schema),
	})
	const { reset } = form

	useEffect(() => {
		reset({
			extension: filters?.extension as string,
			metadata: {
				...((filters?.metadata as Record<string, string[]>) || {}),
				age_rating: (filters?.metadata as Record<string, unknown>)?.age_rating ?? null,
			},
			read_status: filters?.read_status as ReadStatus[],
		})
	}, [reset, filters])

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
			{!!seriesContext && (
				<CheckBox
					label="Only show options available from series"
					checked={onlyFromSeries}
					onClick={() => setOnlyFromSeries((prev) => !prev)}
				/>
			)}

			<ExtensionSelect />
			<ReadStatusSelect />
			<AgeRatingFilter />

			<GenericFilterMultiselect
				name="metadata.genre"
				label="Genre"
				options={data?.genres.map((genre) => ({ label: genre, value: genre.toLowerCase() })) || []}
			/>

			<GenericFilterMultiselect
				name="metadata.writer"
				label="Writer"
				options={
					data?.writers.map((writer) => ({ label: writer, value: writer.toLowerCase() })) || []
				}
			/>

			<GenericFilterMultiselect
				name="metadata.penciller"
				label="Penciller"
				options={
					data?.pencillers.map((penciller) => ({
						label: penciller,
						value: penciller.toLowerCase(),
					})) || []
				}
			/>

			<GenericFilterMultiselect
				name="metadata.colorist"
				label="Colorist"
				options={
					data?.colorists.map((colorist) => ({ label: colorist, value: colorist.toLowerCase() })) ||
					[]
				}
			/>

			<GenericFilterMultiselect
				name="metadata.letterer"
				label="Letterer"
				options={
					data?.letterers.map((letterer) => ({ label: letterer, value: letterer.toLowerCase() })) ||
					[]
				}
			/>

			<GenericFilterMultiselect
				name="metadata.inker"
				label="Inker"
				options={data?.inkers.map((inker) => ({ label: inker, value: inker.toLowerCase() })) || []}
			/>

			<GenericFilterMultiselect
				name="metadata.publisher"
				label="Publisher"
				options={
					data?.publishers.map((publisher) => ({
						label: publisher,
						value: publisher.toLowerCase(),
					})) || []
				}
			/>

			<GenericFilterMultiselect
				name="metadata.editor"
				label="Editor"
				options={
					data?.editors.map((editor) => ({ label: editor, value: editor.toLowerCase() })) || []
				}
			/>

			<GenericFilterMultiselect
				name="metadata.character"
				label="Character"
				options={
					data?.characters.map((character) => ({
						label: character,
						value: character.toLowerCase(),
					})) || []
				}
			/>
		</Form>
	)
}
