import React from 'react'
import { Button, Dialog, Text } from '../ui'

type Props = {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
}

export default function DeleteServerConfirmation({ isOpen, onClose, onConfirm }: Props) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Delete Server</Dialog.Title>
					<Dialog.Description>Are you sure you want to delete this server?</Dialog.Description>
				</Dialog.Header>

				<Dialog.Footer className="tablet:flex-row">
					<Dialog.Close asChild>
						<Button className="bg-background">
							<Text>Cancel</Text>
						</Button>
					</Dialog.Close>
					<Button variant="destructive" onPress={onConfirm}>
						<Text>Delete</Text>
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
