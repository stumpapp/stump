import { Database } from 'lucide-react-native'
import { useEffect, useState } from 'react'

import { Button, Dialog, Text } from '~/components/ui'
import { deleteDatabase } from '~/db'

import AppSettingsRow from '../AppSettingsRow'

export default function DeleteDatabase() {
	const [dialogMessage, setDialogMessage] = useState<string | null>(null)

	useEffect(() => {
		if (!dialogMessage) return
		const dialogTimer = setTimeout(() => {
			setDialogMessage(null)
		}, 1000)
		return () => clearTimeout(dialogTimer)
	}, [dialogMessage])

	return (
		<>
			<AppSettingsRow icon={Database} title="Delete Database">
				<Button
					size="sm"
					variant="destructive"
					onPress={async () => {
						try {
							await deleteDatabase(__DEV__)
							setDialogMessage('Please restart the app.')
						} catch (error) {
							console.error('Error deleting database:', error)
							setDialogMessage('Failed to delete database.')
						}
					}}
				>
					<Text className="text-foreground">Delete</Text>
				</Button>
			</AppSettingsRow>

			<Dialog open={!!dialogMessage} onOpenChange={() => setDialogMessage(null)}>
				<Dialog.Content>
					<Dialog.Title>
						{dialogMessage === 'Please restart the app.' ? 'Database Deleted' : 'Error'}
					</Dialog.Title>
					<Dialog.Description>{dialogMessage}</Dialog.Description>
				</Dialog.Content>
			</Dialog>
		</>
	)
}
