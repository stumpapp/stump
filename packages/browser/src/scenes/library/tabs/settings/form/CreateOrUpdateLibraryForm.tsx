import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form } from '@stump/components'
import type { Library } from '@stump/types'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ContentContainer } from '@/components/container'
import DirectoryPickerModal from '@/components/DirectoryPickerModal'

import { buildScema, CreateOrUpdateLibrarySchema, formDefaults } from './schema'
import {
	BasicLibraryInformation,
	FileConversionOptions,
	LibraryPattern as LibraryPatternSection,
	ScanMode,
	ThumbnailConfig,
} from './sections'
import IgnoreRulesConfig from './sections/IgnoreRulesConfig'

type Props = {
	library?: Library
	existingLibraries: Library[]
	onSubmit: (values: CreateOrUpdateLibrarySchema) => void
	isLoading?: boolean
}

export default function CreateOrEditLibraryForm({
	library,
	existingLibraries,
	onSubmit,
	isLoading,
}: Props) {
	const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)

	const schema = useMemo(() => buildScema(existingLibraries, library), [existingLibraries, library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const { reset } = form
	useEffect(() => {
		return () => {
			reset()
		}
	}, [reset])

	const isCreatingLibrary = !library

	// const { tags } = useTags()

	// const { editLibraryAsync } = useEditLibraryMutation({
	// 	onSuccess: async () => {
	// 		await invalidateQueries({ exact: false, keys: [libraryQueryKeys.getLibraryById] })
	// 		navigate(paths.home())
	// 	},
	// })

	// const handleUpdateLibrary = async (values: Schema) => {
	// 	if (!library) {
	// 		return
	// 	}

	// 	const { name, path, description, tags: formTags, scan_mode, ignore_rules, ...rest } = values

	// 	const library_options = {
	// 		...library.library_options,
	// 		...rest,
	// 		ignore_rules: ignore_rules.map((rule) => rule.glob),
	// 		thumbnail_config: {
	// 			...(library.library_options.thumbnail_config || {}),
	// 			...rest.thumbnail_config,
	// 		},
	// 	} as LibraryOptions

	// 	const existingTags = tags.filter((tag) => formTags?.some((t) => t.value === tag.name))

	// 	// const tagsToCreate = formTags
	// 	// 	?.map((tag) => tag.value)
	// 	// 	.filter((tagName: string) => !existingTags.some((t) => t.name === tagName))

	// 	// let removedTags = getRemovedTags(formTags)

	// 	// if (!removedTags?.length) {
	// 	// 	removedTags = null
	// 	// }

	// 	// if (tagsToCreate.length) {
	// 	// 	const res = await tryCreateTags(tagsToCreate)

	// 	// 	if (res.status > 201) {
	// 	// 		toast.error('Something went wrong when creating the tags.')
	// 	// 		return
	// 	// 	}

	// 	// 	existingTags = existingTags.concat(res.data)
	// 	// }

	// 	toast.promise(
	// 		editLibraryAsync({
	// 			...library,
	// 			description,
	// 			library_options,
	// 			name,
	// 			path,
	// 			// removed_tags: removedTags,
	// 			removed_tags: [],
	// 			scan_mode,
	// 			tags: existingTags,
	// 		}),
	// 		{
	// 			error: 'Something went wrong.',
	// 			loading: 'Updating library...',
	// 			success: 'Updates saved!',
	// 		},
	// 	)
	// }

	const [formPath] = form.watch(['path'])

	return (
		<>
			<DirectoryPickerModal
				isOpen={showDirectoryPicker}
				onClose={() => setShowDirectoryPicker(false)}
				startingPath={formPath}
				onPathChange={(path) => {
					if (path) {
						form.setValue('path', path)
					}
				}}
			/>
			<Form form={form} onSubmit={onSubmit}>
				<ContentContainer className="mt-0">
					<BasicLibraryInformation onSetShowDirectoryPicker={setShowDirectoryPicker} />

					{isCreatingLibrary && <LibraryPatternSection />}
					<FileConversionOptions />
					<ThumbnailConfig />
					<IgnoreRulesConfig />
					<ScanMode isCreatingLibrary={isCreatingLibrary} />

					<div className="mt-6 flex w-full md:max-w-sm">
						<Button className="w-full md:max-w-sm" variant="primary" isLoading={isLoading}>
							{isCreatingLibrary ? 'Create library' : 'Save changes'}
						</Button>
					</div>
				</ContentContainer>
			</Form>
		</>
	)
}
