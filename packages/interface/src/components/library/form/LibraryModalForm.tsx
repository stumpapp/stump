import {
	FormErrorMessage,
	FormLabel,
	HStack,
	InputGroup,
	InputRightElement,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TagOption } from '@stump/client'
import { useLibraries } from '@stump/client'
import type { Library, LibraryPattern, LibraryScanMode } from '@stump/types'
import { useEffect, useMemo, useRef } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { z } from 'zod'

import Checkbox from '../../../ui/Checkbox'
import Form, { FormControl } from '../../../ui/Form'
import Input from '../../../ui/Input'
import { Tab } from '../../../ui/Tabs'
import TextArea from '../../../ui/TextArea'
import DirectoryPickerModal from '../../DirectoryPickerModal'
import TagSelect from '../../TagSelect'
import { LibraryPatternRadio } from './LibraryPatternRadio'
interface Props {
	tags: TagOption[]
	onSubmit(values: FieldValues): void
	fetchingTags?: boolean
	reset?: boolean
	library?: Library
}

/**
 * This is a form for creating and editing libraries. It is used in the `CreateLibraryModal` and `EditLibraryModal` components.
 * It is not intended to be used outside of those components.
 */
// FIXME: tab focus is not working, e.g. when you press tab, it should go to the next form element
// TODO: I think this should be broken up... it's getting a bit big
export default function LibraryModalForm({ tags, onSubmit, fetchingTags, reset, library }: Props) {
	const { libraries } = useLibraries()

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
				(val) => !(libraries.some((l) => l.name === val) && library?.name !== val),
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
				(val) => !(libraries.some((l) => l.path.startsWith(val)) && library?.path !== val),
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

	// TODO: maybe check if each error has a message? then if not, log it for
	// debugging purposes.
	const errors = useMemo(() => {
		return form.formState.errors
	}, [form.formState.errors])

	// const convertRarToZip = form.watch('convertRarToZip');
	const [scanMode, convertRarToZip] = form.watch(['scan_mode', 'convert_rar_to_zip'])

	const resetRef = useRef(form.reset)
	useEffect(() => {
		if (reset) {
			resetRef.current()
		}
	}, [reset])

	return (
		<Form
			className="w-full"
			id={library ? 'edit-library-form' : 'create-library-form'}
			form={form}
			onSubmit={onSubmit}
		>
			<Tabs isFitted colorScheme="brand" w="full">
				<TabList>
					<Tab>General</Tab>
					<Tab>Options</Tab>
				</TabList>

				<TabPanels>
					{/* GENERAL LIBRARY INFO TAB */}
					<TabPanel className="flex flex-col space-y-4">
						<FormControl isInvalid={!!errors.name}>
							<FormLabel htmlFor="name">Libary name</FormLabel>
							<Input type="text" placeholder="My Library" autoFocus {...form.register('name')} />
							{!!errors.name && <FormErrorMessage>{errors.name?.message}</FormErrorMessage>}
						</FormControl>

						<FormControl isInvalid={!!errors.path}>
							<FormLabel htmlFor="path">Libary path</FormLabel>
							<InputGroup>
								<Input placeholder="/path/to/library" {...form.register('path')} />
								{/* FIXME: on small breakpoints, paths are visible behind element */}
								<InputRightElement cursor="pointer">
									<DirectoryPickerModal
										startingPath={library?.path}
										onUpdate={(newPath) => form.setValue('path', newPath ?? undefined)}
									/>
								</InputRightElement>
							</InputGroup>
							{!!errors.path && <FormErrorMessage>{errors.path?.message}</FormErrorMessage>}
						</FormControl>

						<TagSelect
							isLoading={fetchingTags}
							options={tags}
							defaultValue={library?.tags?.map((t) => ({ label: t.name, value: t.name }))}
						/>

						<FormControl>
							<FormLabel htmlFor="name">Description</FormLabel>
							<TextArea
								placeholder="A short description of the library (optional)"
								{...form.register('description')}
							/>
						</FormControl>
					</TabPanel>

					{/* LIBRARY OPTIONS */}
					<TabPanel className="flex flex-col space-y-4">
						<LibraryPatternRadio library={library} />

						{/* TODO change entire layout to be better UX, provide information for what each option does */}
						<HStack>
							<FormControl>
								<Checkbox
									title="Scan the library in a syncronous manner. This will allow you to access media as it is being scanned, however is slower as the library gets larger."
									isChecked={scanMode === 'SYNC'}
									colorScheme="brand"
									onChange={() => form.setValue('scan_mode', getNewScanMode('SYNC'))}
								>
									Synchronous Scan
								</Checkbox>
							</FormControl>

							<FormControl>
								<Checkbox
									title="Scan the library using batched insertions. This will be significantly faster, but you will not be able to access media until the scan is complete. This is highly recommended for large libraries or initial scans."
									isChecked={scanMode === 'BATCHED' || !scanMode}
									colorScheme="brand"
									onChange={() => form.setValue('scan_mode', getNewScanMode('BATCHED'))}
								>
									Batched Scan
								</Checkbox>
							</FormControl>
						</HStack>

						{/* FIXME: design this to not be ugly. */}
						{/* <Text>Analysis Options</Text> */}

						<FormControl>
							<Checkbox
								title="Create Webp thumbnails for each scanned media. When turned off, Stump will extract the first image as the thumbnail."
								colorScheme="brand"
								{...form.register('create_webp_thumbnails')}
							>
								Create Webp Thumbnails
							</Checkbox>
						</FormControl>

						<FormControl>
							<Checkbox
								title="When rar files are found, automatically extract them and re-bundle them in a zip file"
								colorScheme="brand"
								{...form.register('convert_rar_to_zip')}
							>
								Convert rar files to zip
							</Checkbox>
						</FormControl>

						<FormControl>
							<Checkbox
								title="When rar files have been converted to zip, automatically remove them from the host machine. The files are *not recoverable*"
								colorScheme="brand"
								disabled={!convertRarToZip}
								{...form.register('hard_delete_conversions')}
							>
								Permanently delete rar files after conversion
							</Checkbox>
						</FormControl>
					</TabPanel>
				</TabPanels>
			</Tabs>
		</Form>
	)
}
