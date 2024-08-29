import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildScema,
	CreateOrUpdateLibrarySchema,
	ensureValidThumbnailConfig,
	formDefaults,
	ThumbnailConfig,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../../context'
import ThumbnailManagementSection from './ThumbnailManagementSection'

export default function ThumbnailSettingsScene() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildScema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({ thumbnail_config }: Pick<CreateOrUpdateLibrarySchema, 'thumbnail_config'>) => {
			patch({
				library_options: {
					...library.library_options,
					thumbnail_config: ensureValidThumbnailConfig(thumbnail_config),
				},
				scan_mode: 'NONE',
			})
		},
		[patch, library.library_options],
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
