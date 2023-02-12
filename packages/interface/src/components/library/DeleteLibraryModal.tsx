import {
	MenuItem,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	useDisclosure,
} from '@chakra-ui/react'
import { queryClient, useLibraryMutation } from '@stump/client'
import type { Library } from '@stump/types'
import { Trash } from 'phosphor-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import Button, { ModalCloseButton } from '../../ui/Button'
interface Props {
	disabled?: boolean
	library: Library
}

// TODO: custom tabs, active state is atrocious
export default function DeleteLibraryModal({ disabled, library }: Props) {
	const navigate = useNavigate()

	const { isOpen, onOpen, onClose } = useDisclosure()

	const { deleteLibraryAsync } = useLibraryMutation({
		onDeleted() {
			// TODO: these just needs to be wrapped around some utility at this point with
			// how often I'm doing it
			queryClient.invalidateQueries(['getLibrariesStats'])
			queryClient.invalidateQueries(['getSeries'])
			queryClient.invalidateQueries(['getRecentlyAddedSeries'])
			queryClient.invalidateQueries(['getRecentlyAddedMedia'])

			onClose()
			navigate('/')
		},
	})

	function handleDelete() {
		if (disabled) {
			// This should never happen, but here just in case
			throw new Error('You do not have permission to delete libraries.')
		} else {
			toast.promise(deleteLibraryAsync(library.id), {
				error: 'Error Deleting Library',
				loading: 'Deleting Library...',
				success: 'Library Deleted!',
			})
		}
	}

	function handleOpen() {
		if (!disabled) {
			onOpen()
		}
	}

	return (
		<>
			<MenuItem disabled={disabled} icon={<Trash size={'1rem'} />} onClick={handleOpen}>
				Delete
			</MenuItem>

			<Modal
				isCentered
				size={{ base: 'sm', sm: 'xl' }}
				isOpen={disabled ? false : isOpen}
				onClose={onClose}
			>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Delete {library.name}</ModalHeader>
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
	)
}
