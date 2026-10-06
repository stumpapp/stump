import * as Device from 'expo-device'
import { Platform } from 'react-native'

import { usePreferencesStore } from '~/stores'

import { Card } from '../ui'

export function DeviceSection() {
	const deviceName = usePreferencesStore((state) => state.deviceName)
	const patchStore = usePreferencesStore((state) => state.patch)

	const setDeviceName = (name: string) => patchStore({ deviceName: name })

	const placeholderName =
		Device.deviceName || (Platform.OS === 'ios' ? 'My iOS Device' : 'My Android Device')

	return (
		<Card
			label="Device"
			description="Some reading features correlate activity to specific devices. You can set these if you want to opt-in to that behavior"
		>
			<Card.InputRow
				label="Friendly Name"
				value={deviceName ?? ''}
				onChangeText={setDeviceName}
				placeholder={placeholderName}
				autoCapitalize="none"
			/>
		</Card>
	)
}
