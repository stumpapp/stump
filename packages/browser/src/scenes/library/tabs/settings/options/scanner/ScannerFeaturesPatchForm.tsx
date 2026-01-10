import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
	ScannerOptInFeatures,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../../context'

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
			processMetadata,
			watch,
			generateFileHashes,
			generateKoreaderHashes,
		}: Pick<
			CreateOrUpdateLibrarySchema,
			'processMetadata' | 'watch' | 'generateFileHashes' | 'generateKoreaderHashes'
		>) => {
			patch({
				config: {
					generateFileHashes,
					processMetadata,
					watch,
					generateKoreaderHashes,
				},
				scanAfterPersist: false,
			})
		},
		[patch],
	)

	// Note: The underlying sub-form requires a form in the context, so I am wrapping it in one. However, the submit
	// won't ever trigger, which is why there is the `onDidChange` callback.
	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="space-y-12">
			<ScannerOptInFeatures onDidChange={handleSubmit} />
		</Form>
	)
}
