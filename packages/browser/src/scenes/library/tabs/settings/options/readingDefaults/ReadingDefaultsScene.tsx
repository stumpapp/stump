import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	DefaultReadingSettings,
	formDefaults,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../../context'

type PatchParams = Partial<
	Pick<
		CreateOrUpdateLibrarySchema,
		'default_reading_dir' | 'default_reading_image_scale_fit' | 'default_reading_mode'
	>
>

export default function ReadingDefaultsScene() {
	const { library, patch } = useLibraryManagement()

	const handleSubmit = useCallback(
		(params: PatchParams) => {
			patch({
				config: {
					...library.config,
					...params,
				},
				scan_mode: 'NONE',
			})
		},
		[patch, library.config],
	)

	const form = useForm<PatchParams>({
		defaultValues: formDefaults(library),
		resolver: zodResolver(buildSchema([], library)),
	})

	return (
		<Form fieldsetClassName="flex flex-col gap-12 md:max-w-xl" form={form} onSubmit={handleSubmit}>
			<DefaultReadingSettings />
		</Form>
	)
}
