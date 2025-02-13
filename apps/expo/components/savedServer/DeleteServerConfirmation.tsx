import React from 'react'
import { Button, Dialog, Text } from '../ui'
import { SavedServer } from '~/stores/savedServer'
import { View } from 'react-native'

type Props = {
	deletingServer: SavedServer | null
	onClose: () => void
	onConfirm: () => void
}

export default function DeleteServerConfirmation({ deletingServer, onClose, onConfirm }: Props) {
	return (
		<Dialog open={!!deletingServer} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Delete Server</Dialog.Title>
					<Dialog.Description>Are you sure you want to delete this server?</Dialog.Description>
				</Dialog.Header>

				{deletingServer?.stumpOPDS && (
					<View className="rounded-xl bg-fill-danger-secondary p-3">
						<Text className="text-fill-danger">
							This server is registered for both Stump and OPDS. Deleting it will remove both
							entries
						</Text>
					</View>
				)}

				<Dialog.Footer className="tablet:flex-row">
					<Dialog.Close asChild>
						<Button className="my-0.5 bg-background" size="sm">
							<Text>Cancel</Text>
						</Button>
					</Dialog.Close>
					<Button className="my-0.5" variant="destructive" onPress={onConfirm} size="sm">
						<Text>Delete</Text>
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
