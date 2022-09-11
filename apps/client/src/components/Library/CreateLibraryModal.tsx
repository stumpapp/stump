import { FieldValues } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import client from '~api/client';
import { createLibrary } from '~api/library';
import Button, { ModalCloseButton } from '~ui/Button';
import {
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	useDisclosure,
} from '@chakra-ui/react';

import { TagOption, useTags } from '~hooks/useTags';
import LibraryModalForm from './LibraryModalForm';
import { ApiResult, LibraryOptions, Tag } from '@stump/core';

interface Props {
	trigger?: (props: any) => JSX.Element;
	disabled?: boolean;
}

export default function CreateLibraryModal({ disabled, ...props }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { tags, options, isLoading: fetchingTags, createTagsAsync: tryCreateTags } = useTags();

	const { isLoading, mutateAsync } = useMutation(['createLibrary'], {
		mutationFn: createLibrary,
		onSuccess: (res) => {
			if (!res.data) {
				// throw new Error('Something went wrong.');
				// TODO: log?
			} else {
				client.invalidateQueries(['getLibraries']);
				client.invalidateQueries(['getJobReports']);
				onClose();
			}
		},
		onError: (err) => {
			// TODO: handle this error
			// toast.error('Login failed. Please try again.');
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
			mutateAsync({ name, path, description, tags: existingTags, scanMode, libraryOptions }),
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
					Add new library
				</Button>
			)}

			<Modal size="xl" isOpen={disabled ? false : isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Add new library</ModalHeader>
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
							isLoading={isLoading}
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
