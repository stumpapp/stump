import {
	ButtonGroup,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	ModalProps,
} from '@chakra-ui/react'

import Button from './Button'

export type ConfirmationModalProps = {
	title?: string
	onConfirm: () => void
} & ModalProps

export default function ConfirmationModal({
	title,
	onConfirm,
	children,
	...props
}: ConfirmationModalProps) {
	return (
		<Modal size={{ base: 'sm', md: 'md' }} {...props}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>{title || 'Are you sure?'}</ModalHeader>
				<ModalBody>{children}</ModalBody>
				<ModalFooter>
					<ButtonGroup>
						<Button onClick={props.onClose}>Cancel</Button>
						<Button variant="solid" colorScheme="brand" onClick={onConfirm}>
							Confirm
						</Button>
					</ButtonGroup>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
