import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildScema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
	ThumbnailConfig,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../../context'
import LibraryThumbnailSelector from './LibraryThumbnailSelector'

export default function ThumbnailSettingsScene() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildScema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		(values: CreateOrUpdateLibrarySchema) => {
			patch({})
		},
		[patch],
	)

	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="flex flex-col gap-12">
			<ThumbnailConfig />
			<LibraryThumbnailSelector />
		</Form>
	)
}
