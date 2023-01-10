import {
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	useDisclosure,
} from '@chakra-ui/react'
import { logout } from '@stump/api'
import { useUserStore } from '@stump/client'
import { SignOut } from 'phosphor-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import Button, { ModalCloseButton } from '../../ui/Button'
import ToolTip from '../../ui/ToolTip'

export default function Logout() {
	const { isOpen, onOpen, onClose } = useDisclosure()

	const { setUser } = useUserStore()

	const navigate = useNavigate()

	async function handleLogout() {
		toast
			.promise(logout(), {
				error: 'There was an error logging you out. Please try again.',
				loading: null,
				success: 'You have been logged out. Redirecting...',
			})
			.then(() => {
				setUser(null)
				navigate('/auth')
			})
	}

	return (
		<>
			<ToolTip label="Sign out">
				<Button
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
			</ToolTip>

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
	)
}
