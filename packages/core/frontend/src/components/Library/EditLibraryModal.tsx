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

interface Props {
	library: Library;
}

// TODO: custom tabs, active state is atrocious
export default function EditLibraryModal({ library }: Props) {
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
		const { name, path, description, tags: formTags } = values;

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

		console.log({ ...library, name, path, description, tags: existingTags, removedTags });

		toast.promise(
			mutateAsync({ ...library, name, path, description, tags: existingTags, removedTags }),
			{
				loading: 'Updating library...',
				success: 'Updates saved!',
				error: 'Something went wrong.',
			},
		);
	}

	return (
		<>
			<MenuItem icon={<NotePencil size={'1rem'} />} onClick={onOpen}>
				Edit
			</MenuItem>

			<Modal size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>{library.name}</ModalHeader>
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
