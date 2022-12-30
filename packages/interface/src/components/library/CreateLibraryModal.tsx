import { FieldValues } from 'react-hook-form';
import toast from 'react-hot-toast';

import {
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	useDisclosure,
} from '@chakra-ui/react';
import { useLibraryMutation, useTags } from '@stump/client';

import Button, { ModalCloseButton } from '../../ui/Button';
import LibraryModalForm from './form/LibraryModalForm';

import type { ApiResult, LibraryOptions, Tag, TagOption } from '@stump/client';

interface Props {
	trigger?: (props: any) => JSX.Element;
	disabled?: boolean;
}

export default function CreateLibraryModal({ disabled, ...props }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { tags, options, isLoading: fetchingTags, createTagsAsync: tryCreateTags } = useTags();

	const { createIsLoading, createLibraryAsync: createLibrary } = useLibraryMutation({
		onCreated: onClose,
		onCreateFailed(res) {
			toast.error('Failed to create library.');
			console.error(res);
		},
		onError(err) {
			toast.error('Failed to create library.');
			console.error(err);
		},
	});

	// /Users/aaronleopold/Documents/Stump/Demo
	async function handleSubmit(values: FieldValues) {
		if (disabled) {
			// This is extra protection, should never happen. Making it an error so it is
			// easier to find on the chance it does.
			throw new Error('You do not have permission to create libraries.');
		}

		const { name, path, description, tags: formTags, scan_mode, ...library_options } = values;

		// console.log({ name, path, description, tags: formTags, scan_mode, library_options });

		let existingTags = tags.filter((tag) => formTags?.some((t: TagOption) => t.value === tag.name));

		let tagsToCreate = formTags
			?.map((tag: TagOption) => tag.value)
			.filter((tagName: string) => !existingTags.some((t) => t.name === tagName));

		if (tagsToCreate && tagsToCreate.length > 0) {
			const res: ApiResult<Tag[]> = await tryCreateTags(tagsToCreate);

			if (res.status > 201) {
				toast.error('Something went wrong when creating the tags.');
				return;
			}

			existingTags = existingTags.concat(res.data);
		}

		toast.promise(
			createLibrary({
				name,
				path,
				description,
				tags: existingTags,
				scan_mode,
				library_options: library_options as LibraryOptions,
			}),
			{
				loading: 'Creating library...',
				success: 'Library created!',
				error: 'Something went wrong.',
			},
		);
	}

	function handleOpen() {
		if (!disabled) {
			onOpen();
		}
	}

	return (
		<>
			{props.trigger ? (
				<props.trigger onClick={handleOpen} />
			) : (
				<Button
					variant="outline"
					key="CreateLibraryModalTrigger"
					w="full"
					rounded="md"
					size="sm"
					color={{ _dark: 'gray.200', _light: 'gray.600' }}
					_hover={{
						color: 'gray.900',
						bg: 'gray.50',
						_dark: { bg: 'gray.700', color: 'gray.100' },
					}}
					fontSize="sm"
					fontWeight={'medium'}
					onClick={handleOpen}
				>
					Create Library
				</Button>
			)}

			<Modal
				isCentered
				size={{ base: 'sm', sm: 'xl' }}
				isOpen={disabled ? false : isOpen}
				onClose={onClose}
			>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Create Library</ModalHeader>
					<ModalCloseButton />
					<ModalBody w="full" px={{ base: 0, md: 6 }}>
						<LibraryModalForm
							tags={options}
							fetchingTags={fetchingTags}
							onSubmit={handleSubmit}
							reset={!isOpen}
						/>
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose} w={{ base: 'full', md: 'auto' }}>
							Cancel
						</Button>
						<Button
							isLoading={createIsLoading}
							colorScheme="brand"
							type="submit"
							form="create-library-form"
							w={{ base: 'full', md: 'auto' }}
						>
							Create
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
