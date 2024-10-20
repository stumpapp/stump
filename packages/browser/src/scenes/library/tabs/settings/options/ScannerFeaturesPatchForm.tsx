import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
	LibraryPattern,
	ScannerOptInFeatures,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../context'

export default function ScannerFeaturesPatchForm() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildSchema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({
			process_metadata,
			generate_file_hashes,
		}: Pick<CreateOrUpdateLibrarySchema, 'process_metadata' | 'generate_file_hashes'>) => {
			patch({
				config: {
					...library.config,
					generate_file_hashes,
					process_metadata,
				},
				scan_mode: 'NONE',
			})
		},
		[patch, library],
	)

	// Note: The underlying sub-form requires a form in the context, so I am wrapping it in one. However, the submit
	// won't ever trigger, which is why there is the `onDidChange` callback.
	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="space-y-12">
			{/* Note: This component doesn't really belong here, but I didn't want to wrap it in its own form when it is just for display */}
			{/* Should probably create a separate, non-formy variant */}
			<LibraryPattern />
			<ScannerOptInFeatures onDidChange={handleSubmit} />
		</Form>
	)
}
