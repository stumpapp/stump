import React from 'react';
import {
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalHeader,
	ModalOverlay,
	useDisclosure,
} from '@chakra-ui/react';
import { Folder } from 'phosphor-react';
import toast from 'react-hot-toast';

export default function FileSystemModal() {
	const { isOpen, onOpen, onClose } = useDisclosure();

	// TODO: invoke endpoint to grab list of folders

	function dontOpen() {
		toast.error("I can't do this yet. Please enter path manually.");
	}

	return (
		<>
			<Folder onClick={dontOpen} />

			<Modal isCentered size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader></ModalHeader>
					<ModalCloseButton />
					<ModalBody w="full"></ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
}
