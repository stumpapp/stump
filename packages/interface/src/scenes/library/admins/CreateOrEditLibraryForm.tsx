import { zodResolver } from '@hookform/resolvers/zod'
import { useTags } from '@stump/client'
import {
	Button,
	cx,
	Form,
	Heading,
	IconButton,
	Input,
	Link,
	Switch,
	Text,
	TextArea,
} from '@stump/components'
import type { Library, LibraryPattern, LibraryScanMode } from '@stump/types'
import { Folder } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import TagSelect from '../../../components/TagSelect'
import { useLocaleContext } from '../../../i18n'
import LibraryPatternRadioGroup from './LibraryPatternRadioGroup'

type Props = {
	library?: Library
	existingLibraries: Library[]
}

export default function CreateOrEditLibraryForm({ library, existingLibraries }: Props) {
	const { tags, createTagsAsync, isLoading: isLoadingTags } = useTags()

	const isEditing = !!library

	const [scantype, changeType] = useState('')
	const [rar, rarToggle] = useState(false)
	const [deleterar, forceUncheck] = useState(false)

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
				// z.any(),
			)
			.optional(),
	})

	const form = useForm({
		defaultValues: library
			? {
					convert_rar_to_zip: library.library_options.convert_rar_to_zip,
					create_webp_thumbnails: library.library_options.create_webp_thumbnails,
					description: library.description,
					hard_delete_conversions: library.library_options.hard_delete_conversions,
					library_pattern: library.library_options.library_pattern,
					name: library.name,
					path: library.path,
					scan_mode: 'BATCHED',
					tags: library.tags?.map((t) => ({ label: t.name, value: t.name })),
			  }
			: {},
		resolver: zodResolver(schema),
	})

	const errors = useMemo(() => {
		return form.formState.errors
	}, [form.formState.errors])

	// const convertRarToZip = form.watch('convertRarToZip');
	const [scanMode, convertRarToZip, hardDeleteConversions] = form.watch([
		'scan_mode',
		'convert_rar_to_zip',
		'hard_delete_conversions',
	])

	useEffect(() => {
		if (!rar && deleterar) {
			forceUncheck(false)
		}
	}, [rar, deleterar])

	return (
		// @ts-expect-error: FIXME: invalid type error, aaron fix your shit
		<Form form={form}>
			<div className="flex flex-col gap-4">
				<Heading size="md"> {'General'}</Heading>
				<Input label="Library Name" placeholder="My Library" {...form.register('name')} />
				<div className="relative flex flex-row items-center">
					<Input label="Library path" placeholder="/path/to/library" {...form.register('path')} />

					{/* <div className="absolute">
						<IconButton size="xs">
							<Folder className="font-xs" />
						</IconButton>
					</div> */}
				</div>

				<TagSelect
					isLoading={isLoadingTags}
					options={tags.map((tag) => ({ label: tag.name, value: tag.name }))}
					defaultValue={library?.tags?.map((tag) => ({ label: tag.name, value: tag.name }))}
				/>

				<TextArea
					className="flex w-96"
					label="Description"
					placeholder="A short description of your library (optional)"
					{...form.register('description')}
				/>
			</div>
			<div className="flex flex-col gap-4">
				<Heading size="md">{'Options'}</Heading>

				<LibraryPatternRadioGroup />

				<div className="flex flex-auto gap-12">
					<Switch
						id="sync"
						label="Synchronous Scan"
						checked={scantype == 'synchronous'}
						onClick={() => (
							scantype == 'synchronous' ? changeType('') : changeType('synchronous'),
							form.setValue('scan_mode', 'SYNC')
						)}
					/>
					<Switch
						label="Batched Scan"
						checked={scantype == 'batch'}
						onClick={() => (
							scantype == 'batch' ? changeType('') : changeType('batch'),
							form.setValue('scan_mode', 'BATCHED')
						)}
					/>
					<Switch label="Create Webp Thumbnails" {...form.register('create_webp_thumbnails')} />
					<Switch
						checked={rar}
						label="Convert .rar files to .zip"
						onClick={() => rarToggle(!rar)}
						{...form.register('convert_rar_to_zip')}
					/>
					<Switch
						checked={deleterar}
						onClick={() => forceUncheck(!deleterar)}
						disabled={!rar}
						label="Permanently delete .rar files after conversion"
						{...form.register('hard_delete_conversions')}
					/>
				</div>
			</div>
		</Form>
	)
}
