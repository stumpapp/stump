import { zodResolver } from '@hookform/resolvers/zod'
import { useTags } from '@stump/client'
import {
	Button,
	Divider,
	Form,
	Heading,
	IconButton,
	Input,
	Label,
	RawSwitch,
	Switch,
	Text,
	TextArea,
} from '@stump/components'
import type { Library, LibraryPattern, LibraryScanMode } from '@stump/types'
import { Folder } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import DirectoryPickerModal from '../../../components/DirectoryPickerModal'
import TagSelect from '../../../components/TagSelect'
import { useLocaleContext } from '../../../i18n'
import { useLibraryAdminContext } from './context'
import LibraryPatternRadioGroup from './LibraryPatternRadioGroup'

type Props = {
	library?: Library
	existingLibraries: Library[]
}

export default function CreateOrEditLibraryForm({ library, existingLibraries }: Props) {
	const { syncLibraryPreview } = useLibraryAdminContext()

	const { tags, createTagsAsync, isLoading: isLoadingTags } = useTags()

	const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)

	const { t } = useLocaleContext()

	function isLibraryScanMode(input: string): input is LibraryScanMode {
		return input === 'SYNC' || input === 'BATCHED' || input === 'NONE' || !input
	}

	function isLibraryPattern(input: string): input is LibraryPattern {
		return input === 'SERIES_BASED' || input === 'COLLECTION_BASED' || !input
	}

	function getNewScanMode(value: string) {
		if (value === scanMode) {
			return 'NONE'
		}

		return value
	}

	const schema = z.object({
		convert_rar_to_zip: z.boolean().default(false),
		create_webp_thumbnails: z.boolean().default(false),
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
		scan_mode: z.string().refine(isLibraryScanMode).default('BATCHED'),
		tags: z
			.array(
				z.object({
					label: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
	})
	type Schema = z.infer<typeof schema>

	const form = useForm<Schema>({
		defaultValues: {
			convert_rar_to_zip: library?.library_options.convert_rar_to_zip ?? false,
			create_webp_thumbnails: library?.library_options.create_webp_thumbnails ?? false,
			description: library?.description,
			hard_delete_conversions: library?.library_options.hard_delete_conversions ?? false,
			library_pattern: library?.library_options.library_pattern ?? 'SERIES_BASED',
			name: library?.name,
			path: library?.path,
			scan_mode: 'BATCHED',
			tags: library?.tags?.map((t) => ({ label: t.name, value: t.name })),
		},
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleCreateTag = async (tag: string) => {
		try {
			await createTagsAsync([tag])
		} catch (err) {
			console.error(err)
			// TODO: toast error
		}
	}

	const handleSubmit = async (values: Schema) => {
		alert(JSON.stringify(values, null, 2))
	}

	const errors = useMemo(() => {
		return form.formState.errors
	}, [form.formState.errors])

	const formValues = form.watch()
	const libraryPreview = useMemo(() => {
		const {
			tags,
			library_pattern,
			convert_rar_to_zip,
			create_webp_thumbnails,
			hard_delete_conversions,
			...preview
		} = formValues

		return {
			...preview,
			library_options: {
				...(library?.library_options ?? {
					id: '',
					library_id: '',
				}),
				convert_rar_to_zip,
				create_webp_thumbnails,
				hard_delete_conversions,
				library_pattern,
			},
			tags: tags?.map((tag) => ({
				id: tag.value,
				name: tag.value,
			})),
		} satisfies Partial<Library>
	}, [formValues, library?.library_options])

	const [scanMode, createThumnails, convertRarToZip, hardDeleteConversions] = form.watch([
		'scan_mode',
		'create_webp_thumbnails',
		'convert_rar_to_zip',
		'hard_delete_conversions',
	])

	const handleChangeScanMode = (newMode: LibraryScanMode) => {
		if (newMode === scanMode) {
			form.setValue('scan_mode', 'NONE')
		} else {
			form.setValue('scan_mode', newMode)
		}
	}

	useEffect(
		() => {
			if (!convertRarToZip && hardDeleteConversions) {
				form.setValue('hard_delete_conversions', false)
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[convertRarToZip, hardDeleteConversions],
	)

	// FIXME: this causes infinite rerender...
	// useEffect(() => {
	// 	syncLibraryPreview(libraryPreview)
	// }, [libraryPreview, syncLibraryPreview])

	return (
		<>
			<DirectoryPickerModal
				isOpen={showDirectoryPicker}
				onClose={() => setShowDirectoryPicker(false)}
				startingPath={libraryPreview.path}
				onPathChange={(path) => {
					if (path) {
						form.setValue('path', path)
					}
				}}
			/>
			<Form form={form} onSubmit={handleSubmit} className="">
				<div className="flex flex-grow flex-col gap-6">
					<Input
						variant="primary"
						label="Library Name"
						placeholder="My Library"
						containerClassName="max-w-full md:max-w-sm"
						required
						errorMessage={errors.name?.message}
						{...form.register('name')}
					/>
					<Input
						variant="primary"
						label="Library path"
						placeholder="/path/to/library"
						containerClassName="max-w-full md:max-w-sm"
						icon={
							<IconButton
								size="xs"
								variant="ghost"
								type="button"
								onClick={() => setShowDirectoryPicker(true)}
							>
								<Folder className="h-4 w-4 text-gray-700 dark:text-gray-300" />
							</IconButton>
						}
						required
						errorMessage={errors.path?.message}
						{...form.register('path')}
					/>

					<TagSelect
						isLoading={isLoadingTags}
						options={tags.map((tag) => ({ label: tag.name, value: tag.name }))}
						defaultValue={library?.tags?.map((tag) => ({ label: tag.name, value: tag.name }))}
						onCreateTag={handleCreateTag}
					/>

					<TextArea
						className="flex"
						variant="primary"
						label="Description"
						placeholder="A short description of your library (optional)"
						containerClassName="max-w-full md:max-w-sm"
						{...form.register('description')}
					/>
				</div>

				<div className="py-2">
					<Heading size="xs">Library Options</Heading>
					<Text size="sm" variant="muted" className="mt-1.5">
						The following options are configurable for your library and affect how it is scanned.
					</Text>

					<Divider variant="muted" className="my-3.5" />

					<LibraryPatternRadioGroup />

					<div className="flex max-w-2xl flex-col gap-3 divide-y divide-gray-75 py-2 dark:divide-gray-900">
						<div className="flex items-center justify-between py-6 md:items-start">
							<RawSwitch
								className="text-gray-900"
								checked={scanMode === 'BATCHED'}
								onClick={() => handleChangeScanMode('BATCHED')}
								primaryRing
							/>

							<div className="flex flex-grow flex-col gap-2 text-right">
								<Label>Parallel Scan</Label>
								<Text size="xs" variant="muted">
									A faster scan that indexes your library files in parallel
								</Text>
							</div>
						</div>

						<div className="flex items-center justify-between py-6 md:items-start">
							<RawSwitch
								className="text-gray-900"
								checked={scanMode === 'SYNC'}
								onClick={() => handleChangeScanMode('SYNC')}
								primaryRing
							/>

							<div className="flex flex-grow flex-col gap-2 text-right">
								<Label>In-Order Scan</Label>
								<Text size="xs" variant="muted">
									A standard scan that indexes your library files one at a time
								</Text>
							</div>
						</div>
					</div>

					<div className="flex flex-auto gap-12 pt-4">
						{/* TODO: thumbnails will eventually be a separate subform, as it will get a little complex with
							the future options */}
						<Switch
							label="Create Webp Thumbnails"
							checked={createThumnails}
							onClick={() => form.setValue('create_webp_thumbnails', !createThumnails)}
							{...form.register('create_webp_thumbnails')}
						/>
						<Switch
							checked={convertRarToZip}
							label="Convert .rar files to .zip"
							onClick={() => form.setValue('convert_rar_to_zip', !convertRarToZip)}
							{...form.register('convert_rar_to_zip')}
						/>
						<Switch
							checked={hardDeleteConversions}
							disabled={!convertRarToZip}
							label="Permanently delete .rar files after conversion"
							onClick={() => form.setValue('hard_delete_conversions', !hardDeleteConversions)}
							{...form.register('hard_delete_conversions')}
						/>
					</div>
				</div>

				<div className="mt-4 flex w-full md:max-w-sm">
					<Button className="w-full md:max-w-sm" variant="primary">
						Create Library
					</Button>
				</div>
			</Form>
		</>
	)
}
