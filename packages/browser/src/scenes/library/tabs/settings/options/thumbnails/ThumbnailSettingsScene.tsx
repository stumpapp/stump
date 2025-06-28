import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	ensureValidThumbnailConfig,
	formDefaults,
	ThumbnailConfig,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../../context'
import ThumbnailManagementSection from './ThumbnailManagementSection'

export default function ThumbnailSettingsScene() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildSchema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({ thumbnailConfig }: Pick<CreateOrUpdateLibrarySchema, 'thumbnailConfig'>) => {
			patch({
				config: {
					...library.config,
					thumbnailConfig: ensureValidThumbnailConfig(thumbnailConfig),
				},
				scanAfterPersist: false,
			})
		},
		[patch, library.config],
	)

	return (
		<div className="flex flex-col gap-12">
			<Form form={form} onSubmit={handleSubmit}>
				<ThumbnailConfig />
			</Form>

			<ThumbnailManagementSection />
		</div>
	)
}
