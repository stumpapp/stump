import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	FileConversionOptions,
	formDefaults,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../context'

export default function FileConversionOptionsPatchForm() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildSchema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({
			convert_rar_to_zip,
			hard_delete_conversions,
		}: Pick<CreateOrUpdateLibrarySchema, 'convert_rar_to_zip' | 'hard_delete_conversions'>) => {
			patch({
				library_options: {
					...library.library_options,
					convert_rar_to_zip,
					hard_delete_conversions,
				},
				scan_mode: 'NONE',
			})
		},
		[patch, library],
	)

	// Note: The underlying sub-form requires a form in the context, so I am wrapping it in one. However, the submit
	// won't ever trigger, which is why there is the `onDidChange` callback.
	return (
		<Form form={form} onSubmit={handleSubmit}>
			<FileConversionOptions onDidChange={handleSubmit} />
		</Form>
	)
}
