import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	FileConversionOptions,
	formDefaults,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../../context'

export default function FileConversionOptionsPatchForm() {
	const { t } = useLocaleContext()
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildSchema(t, [], library), [t, library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({
			convertRarToZip,
			hardDeleteConversions,
		}: Pick<CreateOrUpdateLibrarySchema, 'convertRarToZip' | 'hardDeleteConversions'>) => {
			patch({
				config: {
					convertRarToZip,
					hardDeleteConversions,
				},
				scanAfterPersist: false,
			})
		},
		[patch],
	)

	// Note: The underlying sub-form requires a form in the context, so I am wrapping it in one. However, the submit
	// won't ever trigger, which is why there is the `onDidChange` callback.
	return (
		<Form form={form} onSubmit={handleSubmit}>
			<FileConversionOptions onDidChange={handleSubmit} />
		</Form>
	)
}
