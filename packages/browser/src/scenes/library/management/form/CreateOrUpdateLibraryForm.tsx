import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateLibraryMutation, useEditLibraryMutation, useTags } from '@stump/client'
import { Button, Form } from '@stump/components'
import type { Library, LibraryOptions, LibraryPattern, LibraryScanMode } from '@stump/types'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router'
import { z } from 'zod'

import { ContentContainer } from '@/components/container'
import DirectoryPickerModal from '@/components/DirectoryPickerModal'
import paths from '@/paths'

import {
	BasicLibraryInformation,
	FileConversionOptions,
	LibraryPattern as LibraryPatternSection,
	ScanMode,
	ThumbnailConfig,
} from './sections'

function isLibraryScanMode(input: string): input is LibraryScanMode {
	return input === 'DEFAULT' || input === 'QUICK' || input === 'NONE' || !input
}

function isLibraryPattern(input: string): input is LibraryPattern {
	return input === 'SERIES_BASED' || input === 'COLLECTION_BASED' || !input
}

const imageFormatSchema = z.union([
	z.literal('Webp'),
	z.literal('Jpeg'),
	z.literal('JpegXl'),
	z.literal('Png'),
])
const resizeOptionsSchema = z
	.object({
		height: z.number().refine((value) => value > 0, { message: 'Must be greater than 0' }),
		mode: z.union([z.literal('Scaled'), z.literal('Sized')]),
		width: z.number().refine((value) => value > 0, { message: 'Must be greater than 0' }),
	})
	.refine(
		(value) => {
			if (value.mode === 'Scaled') {
				const isInCorrectRange = (num: number) => num > 0 && num <= 1
				return isInCorrectRange(value.height) && isInCorrectRange(value.width)
			} else {
				return value.height > 0 && value.width > 0
			}
		},
		(value) => ({
			message:
				value.mode === 'Scaled'
					? 'Height and width must be between 0 and 1'
					: 'Height and width must be greater than 0',
		}),
	)
const buildScema = (existingLibraries: Library[], library?: Library) =>
	z.object({
		convert_rar_to_zip: z.boolean().default(false),
		description: z.string().nullable(),
		hard_delete_conversions: z.boolean().default(false),
		library_pattern: z.string().refine(isLibraryPattern).default('SERIES_BASED'),
		name: z
			.string()
			.min(1, { message: 'Library name is required' })
			.refine(
				// return falsy value to indicate failure. In this case, if library name is already taken,
				// and we aren't editing that library, then it should fail.
				(val) => !(existingLibraries.some((l) => l.name === val) && library?.name !== val),
				(val) => ({
					message: `You already have a library named ${val}.`,
				}),
			),
		path: z
			.string()
			.min(1, { message: 'Library path is required' })
			.refine(
				// check if path is parent to any existing library
				// if so, and we aren't editing that library, return falsy value to indicate failure
				(val) => !(existingLibraries.some((l) => l.path.startsWith(val)) && library?.path !== val),
				() => ({
					message: 'Invalid library, parent directory already exists as library.',
				}),
			),
		scan_mode: z.string().refine(isLibraryScanMode).default('DEFAULT'),
		tags: z
			.array(
				z.object({
					label: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
		thumbnail_config: z.object({
			enabled: z.boolean().default(false),
			format: imageFormatSchema.default('Webp'),
			quality: z
				.number()
				.optional()
				.refine(
					(value) => value === undefined || (value > 0 && value <= 1.0),
					() => ({
						message: 'Thumbnail quality must be between 0 and 1.0',
					}),
				),
			resize_options: resizeOptionsSchema.optional(),
		}),
	})
export type Schema = z.infer<ReturnType<typeof buildScema>>

type Props = {
	library?: Library
	existingLibraries: Library[]
}

export default function CreateOrEditLibraryForm({ library, existingLibraries }: Props) {
	const navigate = useNavigate()

	const isCreatingLibrary = !library

	const { tags } = useTags()

	const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)

	const schema = buildScema(existingLibraries, library)
	const form = useForm<Schema>({
		defaultValues: {
			convert_rar_to_zip: library?.library_options.convert_rar_to_zip ?? false,
			description: library?.description,
			hard_delete_conversions: library?.library_options.hard_delete_conversions ?? false,
			library_pattern: library?.library_options.library_pattern || 'SERIES_BASED',
			name: library?.name,
			path: library?.path,
			scan_mode: 'DEFAULT',
			tags: library?.tags?.map((t) => ({ label: t.name, value: t.name })),
			// @ts-expect-error: mostly null vs undefined issues
			thumbnail_config: library?.library_options.thumbnail_config
				? {
						enabled: true,
						...library?.library_options.thumbnail_config,
				  }
				: undefined,
		},
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const { createLibraryAsync } = useCreateLibraryMutation({
		onSuccess: () => {
			form.reset()
			navigate(paths.home())
		},
	})

	const { editLibraryAsync } = useEditLibraryMutation({
		onSuccess: () => {
			form.reset()
			navigate(paths.home())
		},
	})

	// const handleCreateTag = async (tag: string) => {
	// 	try {
	// 		await createTagsAsync([tag])
	// 	} catch (err) {
	// 		console.error(err)
	// 		// TODO: toast error
	// 	}
	// }

	const handleCreateLibrary = async (values: Schema) => {
		const { name, path, description, tags: formTags, scan_mode, ...options } = values

		const existingTags = tags.filter((tag) => formTags?.some((t) => t.value === tag.name))
		const tagsToCreate = formTags
			?.map((tag) => tag.value)
			.filter((tagName: string) => !existingTags.some((t) => t.name === tagName))

		if (tagsToCreate && tagsToCreate.length > 0) {
			// TODO: Re-add this logic...
			// const res: APIResult<Tag[]> = await tryCreateTags(tagsToCreate)
			// if (res.status > 201) {
			// 	toast.error('Something went wrong when creating the tags.')
			// 	return
			// }
			// existingTags = existingTags.concat(res.data)
		}

		const library_options = {
			...options,
			thumbnail_config: options.thumbnail_config.enabled ? options.thumbnail_config : null,
		} as LibraryOptions

		toast.promise(
			createLibraryAsync({
				description,
				library_options,
				name,
				path,
				scan_mode,
				tags: existingTags,
			}),
			{
				error: 'Something went wrong.',
				loading: 'Creating library...',
				success: 'Library created!',
			},
		)
	}

	const handleUpdateLibrary = async (values: Schema) => {
		if (!library) {
			return
		}

		const { name, path, description, tags: formTags, scan_mode, ...rest } = values

		const library_options = {
			...library.library_options,
			...rest,
			thumbnail_config: {
				...(library.library_options.thumbnail_config || {}),
				...rest.thumbnail_config,
			},
		} as LibraryOptions

		const existingTags = tags.filter((tag) => formTags?.some((t) => t.value === tag.name))

		// const tagsToCreate = formTags
		// 	?.map((tag) => tag.value)
		// 	.filter((tagName: string) => !existingTags.some((t) => t.name === tagName))

		// let removedTags = getRemovedTags(formTags)

		// if (!removedTags?.length) {
		// 	removedTags = null
		// }

		// if (tagsToCreate.length) {
		// 	const res = await tryCreateTags(tagsToCreate)

		// 	if (res.status > 201) {
		// 		toast.error('Something went wrong when creating the tags.')
		// 		return
		// 	}

		// 	existingTags = existingTags.concat(res.data)
		// }

		toast.promise(
			editLibraryAsync({
				...library,
				description,
				library_options,
				name,
				path,
				// removed_tags: removedTags,
				removed_tags: [],
				scan_mode,
				tags: existingTags,
			}),
			{
				error: 'Something went wrong.',
				loading: 'Updating library...',
				success: 'Updates saved!',
			},
		)
	}

	const handleSubmit = (values: Schema) => {
		if (isCreatingLibrary) {
			handleCreateLibrary(values)
		} else {
			handleUpdateLibrary(values)
		}
	}

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
			<Form form={form} onSubmit={handleSubmit}>
				<ContentContainer className="mt-0">
					<BasicLibraryInformation onSetShowDirectoryPicker={setShowDirectoryPicker} />

					{isCreatingLibrary && <LibraryPatternSection />}

					<FileConversionOptions />

					<ThumbnailConfig />

					<ScanMode isCreatingLibrary={isCreatingLibrary} />

					<div className="mt-6 flex w-full md:max-w-sm">
						<Button className="w-full md:max-w-sm" variant="primary">
							{isCreatingLibrary ? 'Create library' : 'Save changes'}
						</Button>
					</div>
				</ContentContainer>
			</Form>
		</>
	)
}
