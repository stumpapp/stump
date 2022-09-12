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
import { TagOption, useLibraryMutation, useTags } from '@stump/client';
import { ApiResult, LibraryOptions, Tag } from '@stump/core';

import Button, { ModalCloseButton } from '../../ui/Button';
import LibraryModalForm from './LibraryModalForm';

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

		const { name, path, description, tags: formTags, scanMode, ...rest } = values;

		const libraryOptions = rest as LibraryOptions;

		console.debug({ name, path, description, tags: formTags, scanMode, libraryOptions });

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
			createLibrary({ name, path, description, tags: existingTags, scanMode, libraryOptions }),
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

			<Modal size="xl" isOpen={disabled ? false : isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Create Library</ModalHeader>
					<ModalCloseButton />
					<ModalBody w="full">
						<LibraryModalForm
							tags={options}
							fetchingTags={fetchingTags}
							onSubmit={handleSubmit}
							reset={!isOpen}
						/>
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button
							isLoading={createIsLoading}
							colorScheme="brand"
							type="submit"
							form="create-library-form"
						>
							Create
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
