import { Database } from 'lucide-react-native'
import { Alert } from 'react-native'

import { Button, Text } from '~/components/ui'
import { deleteDatabase } from '~/db'
import { useTranslate } from '~/lib/hooks'

import AppSettingsRow from '../AppSettingsRow'

export default function DeleteDatabase() {
	const { t } = useTranslate()
	const onDeletedDatabase = (success: boolean) => {
		const baseKey = success ? 'success' : 'error'
		Alert.alert(t(getKey(`${baseKey}.title`)), t(getKey(`${baseKey}.description`)))
	}

	return (
		<AppSettingsRow icon={Database} title="Delete Database">
			<Button
				size="sm"
				variant="destructive"
				roundness="full"
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
				<Text>Delete</Text>
			</Button>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.debug.deleteDatabase'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
