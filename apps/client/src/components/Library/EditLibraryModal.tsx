import React from 'react';
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	useDisclosure,
	MenuItem,
} from '@chakra-ui/react';
import Button, { ModalCloseButton } from '~components/ui/Button';
import { NotePencil } from 'phosphor-react';
import toast from 'react-hot-toast';
import { FieldValues } from 'react-hook-form';
import LibraryModalForm from './LibraryModalForm';
import { TagOption, useTags } from '~hooks/useTags';
import { useMutation } from 'react-query';
import client from '~api/client';
import { editLibrary } from '~api/mutation/library';
import { createTags } from '~api/mutation/tag';
import { Library, Tag } from '@stump/core';

interface Props {
	library: Library;
	disabled?: boolean;
}

// FIXME: tab navigation not working
export default function EditLibraryModal({ disabled, library }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { tags, options, isLoading: fetchingTags } = useTags();

	const { isLoading, mutateAsync } = useMutation('editLibrary', {
		mutationFn: editLibrary,
		onSuccess: (res) => {
			if (!res.data) {
				// throw new Error('Something went wrong.');
				// TODO: log?
			} else {
				client.invalidateQueries('getLibraries');
				onClose();
			}
		},
		onError: (err) => {
			// TODO: handle this error
			// toast.error('Login failed. Please try again.');
			console.error(err);
		},
	});

	const { mutateAsync: tryCreateTags } = useMutation('createTags', {
		mutationFn: createTags,
	});

	function getRemovedTags(tags: TagOption[]): Tag[] | undefined {
		// All tags were removed, or no tags were there to begin with
		if (tags.length === 0) {
			return library.tags || undefined;
		}

		if (!library.tags || library.tags.length === 0) {
			return undefined;
		}

		// Some tags were removed, but not all
		return library.tags.filter((tag) => !tags.some((tagOption) => tagOption.value === tag.name));
	}

	async function handleSubmit(values: FieldValues) {
		if (disabled) {
			// This is extra protection, should never happen. Making it an error so it is
			// easier to find on the chance it does.
			throw new Error('You do not have permission to update libraries.');
		}

		const { name, path, description, tags: formTags, scan } = values;

		let existingTags = tags.filter((tag) => formTags.some((t: TagOption) => t.value === tag.name));

		let tagsToCreate = formTags
			.map((tag: TagOption) => tag.value)
			.filter((tagName: string) => !existingTags.some((t) => t.name === tagName));

		let removedTags = getRemovedTags(formTags);

		if (!removedTags?.length) {
			removedTags = undefined;
		}

		if (tagsToCreate.length) {
			const res = await tryCreateTags(tagsToCreate);

			if (res.status > 201) {
				toast.error('Something went wrong when creating the tags.');
				return;
			}

			existingTags = existingTags.concat(res.data);
		}

		toast.promise(
			mutateAsync({ ...library, name, path, description, tags: existingTags, removedTags, scan }),
			{
				loading: 'Updating library...',
				success: 'Updates saved!',
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
			<MenuItem disabled={disabled} icon={<NotePencil size={'1rem'} />} onClick={handleOpen}>
				Edit
			</MenuItem>

			<Modal size="xl" isOpen={disabled ? false : isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Update {library.name}</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<LibraryModalForm
							library={library}
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
							form="edit-library-form"
						>
							Save Changes
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
