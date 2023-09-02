import { zodResolver } from '@hookform/resolvers/zod'
import { metadataApi, metadataQueryKeys } from '@stump/api'
import { Form } from '@stump/components'
import React from 'react'
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

// TODO: consider performance of ALL these queries. Maybe just use the root metadata endpoint
// which performs all of these queries at once within one transaction?

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
			className="flex max-h-full grow flex-col overflow-x-visible overflow-y-scroll px-6 scrollbar-hide"
			id="filter-form"
			form={form}
			onSubmit={handleSubmit}
		>
			<ExtensionSelect />

			<GenericFilterMultiselect
				name="metadata.genre"
				label="Genre"
				queryKey={metadataQueryKeys.getGenres}
				queryFn={metadataApi.getGenres}
			/>

			<GenericFilterMultiselect
				name="metadata.writer"
				label="Writer"
				queryKey={metadataQueryKeys.getWriters}
				queryFn={metadataApi.getWriters}
			/>

			<GenericFilterMultiselect
				name="metadata.penciller"
				label="Penciller"
				queryKey={metadataQueryKeys.getPencillers}
				queryFn={metadataApi.getPencillers}
			/>

			<GenericFilterMultiselect
				name="metadata.colorist"
				label="Colorist"
				queryKey={metadataQueryKeys.getColorists}
				queryFn={metadataApi.getColorists}
			/>

			<GenericFilterMultiselect
				name="metadata.letterer"
				label="Letterer"
				queryKey={metadataQueryKeys.getLetterers}
				queryFn={metadataApi.getLetterers}
			/>

			<GenericFilterMultiselect
				name="metadata.inker"
				label="Inker"
				queryKey={metadataQueryKeys.getInkers}
				queryFn={metadataApi.getInkers}
			/>

			<GenericFilterMultiselect
				name="metadata.publisher"
				label="Publisher"
				queryKey={metadataQueryKeys.getPublishers}
				queryFn={metadataApi.getPublishers}
			/>

			<GenericFilterMultiselect
				name="metadata.editor"
				label="Editor"
				queryKey={metadataQueryKeys.getEditors}
				queryFn={metadataApi.getEditors}
			/>

			<GenericFilterMultiselect
				name="metadata.character"
				label="Character"
				queryKey={metadataQueryKeys.getCharacters}
				queryFn={metadataApi.getCharacters}
			/>
		</Form>
	)
}
