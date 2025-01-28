import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form } from '@stump/components'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import DirectoryPickerModal from '@/components/DirectoryPickerModal'
import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
} from '@/components/library/createOrUpdate'
import { BasicLibraryInformation } from '@/components/library/createOrUpdate/sections'

import { useLibraryManagement } from '../context'

export default function BasicSettingsScene() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildSchema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)
	const [path, name, description, tags] = form.watch(['path', 'name', 'description', 'tags'])

	const hasChanges = useMemo(() => {
		const currentTagSet = new Set(tags?.map(({ label }) => label) || [])
		const libraryTagSet = new Set(library?.tags?.map(({ name }) => name) || [])

		return (
			library?.path !== path ||
			library?.name !== name ||
			library?.description !== description ||
			[...currentTagSet].some((tag) => !libraryTagSet.has(tag)) ||
			[...libraryTagSet].some((tag) => !currentTagSet.has(tag))
		)
	}, [library, path, name, description, tags])

	const handleSubmit = useCallback(
		(values: CreateOrUpdateLibrarySchema) => {
			patch({
				description: values.description,
				name: values.name,
				path: values.path,
				scan_mode: library.path !== values.path ? 'DEFAULT' : 'NONE',
				tags: values.tags?.map(({ label }) => label),
			})
		},
		[patch, library],
	)

	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="flex flex-col gap-12">
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
