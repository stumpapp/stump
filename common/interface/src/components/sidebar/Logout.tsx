import { SignOut } from 'phosphor-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import {
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	useDisclosure,
} from '@chakra-ui/react';
import { useUserStore } from '@stump/client';
import { logout } from '@stump/client/api';

import Button, { ModalCloseButton } from '../../ui/Button';

export default function Logout() {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { setUser } = useUserStore();

	const navigate = useNavigate();

	async function handleLogout() {
		toast
			.promise(logout(), {
				loading: null,
				success: 'You have been logged out. Redirecting...',
				error: 'There was an error logging you out. Please try again.',
			})
			.then(() => {
				setUser(null);
				navigate('/auth');
			});
	}

	return (
		<>
			<Button
				title="Sign Out"
				variant="ghost"
				cursor={'pointer'}
				p={0.5}
				size="sm"
				_focus={{
					boxShadow: '0 0 0 3px rgba(196, 130, 89, 0.6);',
				}}
				onClick={onOpen}
			>
				<SignOut className="transform -scale-x-[1]" />
			</Button>

			<Modal isCentered size="lg" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Sign out</ModalHeader>
					<ModalCloseButton />
					<ModalBody className="flex flex-col space-y-2">
						<p>Are you sure you want sign out?</p>
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button colorScheme="red" onClick={handleLogout}>
							Sign out
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
