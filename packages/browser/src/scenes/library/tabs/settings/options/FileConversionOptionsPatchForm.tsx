import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildScema,
	CreateOrUpdateLibrarySchema,
	FileConversionOptions,
	formDefaults,
	libraryPatchDefaults,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../context'

export default function FileConversionOptionsPatchForm() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildScema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({ convert_rar_to_zip, hard_delete_conversions }: CreateOrUpdateLibrarySchema) => {
			patch({
				...library,
				library_options: {
					...library.library_options,
					convert_rar_to_zip,
					hard_delete_conversions,
				},
				...libraryPatchDefaults(library),
			})
		},
		[patch, library],
	)

	return (
		<Form form={form} onSubmit={handleSubmit}>
			{/* TODO: won't submit lol */}
			<FileConversionOptions />
		</Form>
	)
}
