import { Database } from 'lucide-react-native'
import { Alert } from 'react-native'

import { Button, Text } from '~/components/ui'
import { deleteDatabase } from '~/db'

import AppSettingsRow from '../AppSettingsRow'

export default function DeleteDatabase() {
	const onDeletedDatabase = (success: boolean) => {
		Alert.alert(
			success ? 'Database deleted' : 'Error',
			success ? 'Please restart the app' : 'Failed to delete database',
		)
	}

	return (
		<AppSettingsRow icon={Database} title="Delete Database">
			<Button
				size="sm"
				variant="destructive"
				onPress={async () => {
					try {
						await deleteDatabase(__DEV__)
						onDeletedDatabase(true)
					} catch (error) {
						console.error('Error deleting database:', error)
						onDeletedDatabase(false)
					}
				}}
			>
				<Text className="text-foreground">Delete</Text>
			</Button>
		</AppSettingsRow>
	)
}
