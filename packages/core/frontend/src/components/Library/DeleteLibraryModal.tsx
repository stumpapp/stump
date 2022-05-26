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
import { Trash } from 'phosphor-react';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';
import { deleteLibrary } from '~api/mutation/library';
import client from '~api/client';
import { useNavigate } from 'react-router-dom';

interface Props {
	library: Library;
}

// TODO: custom tabs, active state is atrocious
export default function DeleteLibraryModal({ library }: Props) {
	const navigate = useNavigate();

	const { isOpen, onOpen, onClose } = useDisclosure();

	const { mutateAsync } = useMutation('deleteLibrary', {
		mutationFn: deleteLibrary,
		onSuccess: handleSuccess,
	});

	async function handleSuccess() {
		await client.invalidateQueries('getLibraries');

		// TODO: navigate away??

		onClose();

		navigate('/');
	}

	function handleDelete() {
		toast.promise(mutateAsync(library.id), {
			loading: 'Deleting Library...',
			success: 'Library Deleted!',
			error: 'Error Deleting Library',
		});
	}

	return (
		<>
			<MenuItem icon={<Trash size={'1rem'} />} onClick={onOpen}>
				Delete
			</MenuItem>

			<Modal size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>{library.name}</ModalHeader>
					<ModalCloseButton />
					<ModalBody className="flex flex-col space-y-2">
						<p>Are you sure you want to delete this library?</p>

						<p className="font-bold">This action cannot be undone.</p>
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button colorScheme="red" onClick={handleDelete}>
							Delete
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
