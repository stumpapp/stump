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
import { NotePencil } from 'phosphor-react';
import toast from 'react-hot-toast';
import { FieldValues } from 'react-hook-form';
import LibraryModalForm from './form/LibraryModalForm';
import { Library, LibraryOptions, Tag } from '@stump/core';
import { TagOption, useLibraryMutation, useTags } from '@stump/client';
import Button, { ModalCloseButton } from '../../ui/Button';

interface Props {
	library: Library;
	disabled?: boolean;
}

// FIXME: tab navigation not working
export default function EditLibraryModal({ disabled, library }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { tags, options, isLoading: fetchingTags, createTagsAsync: tryCreateTags } = useTags();

	const { editIsLoading, editLibraryAsync: editLibrary } = useLibraryMutation({
		onUpdated: onClose,
		onError(err) {
			console.error(err);
			toast.error('Failed to edit library.');
		},
	});

	function getRemovedTags(tags: TagOption[]): Tag[] | null {
		// All tags were removed, or no tags were there to begin with
		if (tags.length === 0) {
			return library.tags || null;
		}

		if (!library.tags || library.tags.length === 0) {
			return null;
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

		const { name, path, description, tags: formTags, scan_mode, ...rest } = values;

		const library_options = {
			...rest,
			id: library.library_options.id,
		} as LibraryOptions;

		let existingTags = tags.filter((tag) => formTags.some((t: TagOption) => t.value === tag.name));

		let tagsToCreate = formTags
			.map((tag: TagOption) => tag.value)
			.filter((tagName: string) => !existingTags.some((t) => t.name === tagName));

		let removedTags = getRemovedTags(formTags);

		if (!removedTags?.length) {
			removedTags = null;
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
			editLibrary({
				...library,
				name,
				path,
				description,
				tags: existingTags,
				removed_tags: removedTags,
				scan_mode,
				library_options,
			}),
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

			<Modal
				isCentered
				size={{ base: 'sm', sm: 'xl' }}
				isOpen={disabled ? false : isOpen}
				onClose={onClose}
			>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Update {library.name}</ModalHeader>
					<ModalCloseButton />
					<ModalBody px={{ base: 0, md: 6 }}>
						<LibraryModalForm
							library={library}
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
							isLoading={editIsLoading}
							colorScheme="brand"
							type="submit"
							form="edit-library-form"
							w={{ base: 'full', md: 'auto' }}
						>
							Save Changes
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
