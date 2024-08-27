import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form } from '@stump/components'
import React, { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import DirectoryPickerModal from '@/components/DirectoryPickerModal'
import {
	buildScema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
} from '@/components/library/createOrUpdate'
import { BasicLibraryInformation } from '@/components/library/createOrUpdate/sections'

import { useLibraryManagement } from '../context'

export default function BasicSettingsScene() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildScema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)
	const [path, name, description, tags] = form.watch(['path', 'name', 'description', 'tags'])

	// FIXME: not correct, particularly the tags part
	const hasChanges = useMemo(() => {
		return (
			library?.path !== path ||
			library?.name !== name ||
			library?.description !== description ||
			library?.tags
				?.map(({ name }) => name)
				.some((tag) => !tags?.find(({ label }) => label === tag))
		)
	}, [library, path, name, description, tags])

	const handleSubmit = useCallback(
		(values: CreateOrUpdateLibrarySchema) => {
			patch({
				description: values.description,
				name: values.name,
				path: values.path,
				scan_mode: library.path !== values.path ? 'DEFAULT' : 'NONE',
				tags: values.tags?.map(({ value }) => value),
			})
		},
		[patch, library],
	)

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<DirectoryPickerModal
				isOpen={showDirectoryPicker}
				onClose={() => setShowDirectoryPicker(false)}
				startingPath={path}
				onPathChange={(path) => {
					if (path) {
						form.setValue('path', path)
					}
				}}
			/>

			<BasicLibraryInformation onSetShowDirectoryPicker={setShowDirectoryPicker} />

			<div>
				<Button type="submit" disabled={!hasChanges}>
					Update library
				</Button>
			</div>
		</Form>
	)
}
