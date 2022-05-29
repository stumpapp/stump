import React, { useEffect, useMemo } from 'react';
import {
	FormControl,
	FormErrorMessage,
	FormLabel,
	InputGroup,
	InputRightElement,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldValues, useForm } from 'react-hook-form';
import { z } from 'zod';
import FileSystemModal from '~components/FileSystemModal';
import TagSelect from '~components/TagSelect';
import Form from '~components/ui/Form';
import Input from '~components/ui/Input';
import { Tab } from '~components/ui/Tabs';
import TextArea from '~components/ui/TextArea';
import { TagOption } from '~hooks/useTags';
import { useStore } from '~store/store';

interface Props {
	tags: TagOption[];
	onSubmit(values: FieldValues): void;
	fetchingTags?: boolean;
	reset?: boolean;
	library?: Library;
}

/**
 * This is a form for creating and editing libraries. It is used in the `CreateLibraryModal` and `EditLibraryModal` components.
 * It is not intended to be used outside of those components.
 */
export default function LibraryModalForm({ tags, onSubmit, fetchingTags, reset, library }: Props) {
	const libraries = useStore((state) => state.libraries);

	const schema = z.object({
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
		path: z.string().min(1, { message: 'Library path is required' }),
		description: z.string().nullable(),
		tags: z
			.array(
				// FIXME: not sure why this was registering as incorrect type on submit.
				// this will need to be fixed, but I cannot be bothered right now.
				// z.object({
				// 	label: z.string(),
				// 	name: z.string(),
				// }),
				z.any(),
			)
			.optional(),
	});

	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: library
			? {
					name: library.name,
					path: library.path,
					description: library.description,
					tags: library.tags?.map((t) => ({ label: t.name, name: t.name })),
			  }
			: {},
	});

	// TODO: maybe check if each error has a message? then if not, log it for
	// debugging purposes.
	const errors = useMemo(() => {
		return form.formState.errors;
	}, [form.formState.errors]);

	useEffect(() => {
		if (reset) {
			form.reset();
		}
	}, [reset]);

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
					<TabPanel className="flex flex-col space-y-2">
						<FormControl isInvalid={!!errors.name}>
							<FormLabel htmlFor="name">Libary name</FormLabel>
							<Input type="text" placeholder="My Library" autoFocus {...form.register('name')} />
							{!!errors.name && <FormErrorMessage>{errors.name?.message}</FormErrorMessage>}
						</FormControl>

						{/* <input className="hidden" type="file" directory="" webkitdirectory="" /> */}

						<FormControl isInvalid={!!errors.path}>
							<FormLabel htmlFor="path">Libary path</FormLabel>
							<InputGroup>
								<Input placeholder="/path/to/library" {...form.register('path')} />
								<InputRightElement cursor="pointer" children={<FileSystemModal />} />
							</InputGroup>
							{!!errors.path && <FormErrorMessage>{errors.path?.message}</FormErrorMessage>}
						</FormControl>

						<FormControl>
							<FormLabel htmlFor="name">Description</FormLabel>
							<TextArea
								placeholder="A short description of the library (optional)"
								{...form.register('description')}
							/>
						</FormControl>
					</TabPanel>
					<TabPanel>
						<TagSelect
							isLoading={fetchingTags}
							options={tags}
							defaultValue={library?.tags?.map((t) => ({ value: t.name, label: t.name }))}
						/>
					</TabPanel>
				</TabPanels>
			</Tabs>
		</Form>
	);
}
