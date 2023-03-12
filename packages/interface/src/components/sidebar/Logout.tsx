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
import { Button, IconButton } from '@stump/components'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { ModalCloseButton } from '../../ui/Button'
import ToolTip from '../../ui/ToolTip'

export default function Logout() {
	const { isOpen, onOpen, onClose } = useDisclosure()

	const setUser = useUserStore((store) => store.setUser)

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
				<IconButton variant="ghost" size="sm" onClick={onOpen}>
					<LogOut className="h-4 w-4 -scale-x-[1] transform" />
				</IconButton>
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
						<Button variant="outline" onClick={onClose} className="mr-3">
							Cancel
						</Button>
						<Button variant="danger" onClick={handleLogout}>
							Sign out
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	)
}
