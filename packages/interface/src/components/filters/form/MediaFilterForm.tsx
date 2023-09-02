import { zodResolver } from '@hookform/resolvers/zod'
import { metadataApi, metadataQueryKeys } from '@stump/api'
import { useQuery } from '@stump/client'
import { CheckBox, Form } from '@stump/components'
import React, { useMemo, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import z from 'zod'

import { useFilterContext } from '..'
import ExtensionSelect from './ExtensionSelect'
import GenericFilterMultiselect from './GenericFilterMultiselect'

const schema = z.object({
	extension: z.string().optional(),
	metadata: z
		.object({
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
})

/**
 * A crude function that removes empty values from an object. Should probably be tested
 * or sm idk
 */
const removeEmpty = (obj: Record<string, unknown>) => {
	return Object.entries(obj).reduce((acc, [key, value]) => {
		if (typeof value === 'object' && value !== null) {
			acc[key] = removeEmpty(value as Record<string, unknown>)
		} else if (value !== null) {
			acc[key] = value
		}
		return acc
	}, {} as Record<string, unknown>)
}

export default function MediaFilterForm() {
	const { filters, setFilters } = useFilterContext()

	const [onlyFromSeries, setOnlyFromSeries] = useState(false)

	const params = useMemo(() => {
		if (onlyFromSeries) {
			return {
				media: {
					series: {
						id: '',
					},
				},
			}
		}
		return {}
	}, [onlyFromSeries])

	const { data } = useQuery(
		[metadataQueryKeys.getMediaMetadataOverview, params?.media?.series?.id],
		() => metadataApi.getMediaMetadataOverview(params).then((res) => res.data),
	)

	const form = useForm({
		defaultValues: {
			extension: filters?.extension as string,
			metadata: filters?.metadata as Record<string, string[]>,
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
			className="flex max-h-full grow flex-col overflow-x-visible overflow-y-scroll px-6 py-2 scrollbar-hide"
			id="filter-form"
			form={form}
			onSubmit={handleSubmit}
		>
			<CheckBox
				label="Only show options available from series"
				checked={onlyFromSeries}
				onClick={() => setOnlyFromSeries((prev) => !prev)}
			/>

			<ExtensionSelect />

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
