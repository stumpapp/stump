import React from 'react';
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
	useDisclosure,
	MenuItem,
	HStack,
	Text,
	Box,
} from '@chakra-ui/react';
import Button from '~components/ui/Button';
import { Plus, Trash } from 'phosphor-react';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';
import { deleteLibrary } from '~api/mutation/library';
import client from '~api/client';

export default function CreateLibraryModal() {
	const { isOpen, onOpen, onClose } = useDisclosure();

	function handleCreate() {
		toast.error('Not implemented');
	}

	return (
		<>
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
				onClick={onOpen}
			>
				Add new library
			</Button>

			<Modal size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Add new library</ModalHeader>
					<ModalCloseButton />
					<ModalBody className="flex flex-col space-y-2">
						<p>Something something vicky something something</p>
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button colorScheme="brand" onClick={handleCreate}>
							Create
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
