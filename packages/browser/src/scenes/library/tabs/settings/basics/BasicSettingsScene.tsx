import { zodResolver } from '@hookform/resolvers/zod'
import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Button, Form } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import DirectoryPickerModal from '@/components/DirectoryPickerModal'
import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
	intoThumbnailConfig,
} from '@/components/library/createOrUpdate'
import { BasicLibraryInformation } from '@/components/library/createOrUpdate/sections'

import { useLibraryManagement } from '../context'

const query = graphql(`
	query BasicSettingsSceneExistingLibraries {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				path
			}
		}
	}
`)

export default function BasicSettingsScene() {
	const { library, patch } = useLibraryManagement()
	const { sdk } = useSDK()
	const {
		data: {
			libraries: { nodes: libraries },
		},
	} = useSuspenseGraphQL(query, [sdk.cacheKeys.libraryCreateLibraryQuery])

	const schema = useMemo(() => buildSchema(libraries, library), [libraries, library])
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
				config: { thumbnailConfig: intoThumbnailConfig(values.thumbnailConfig) },
				description: values.description,
				name: values.name,
				path: values.path,
				scanAfterPersist: library.path !== values.path,
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
