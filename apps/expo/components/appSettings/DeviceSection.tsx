import * as Device from 'expo-device'
import { Platform } from 'react-native'

import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { Card } from '../ui'

export function DeviceSection() {
	const { translate } = useTranslate()

	const deviceName = usePreferencesStore((state) => state.deviceName)
	const patchStore = usePreferencesStore((state) => state.patch)

	const setDeviceName = (name: string) => patchStore({ deviceName: name })

	const placeholderName =
		Device.deviceName || translate(`shared.readingDevice.placeholder.${Platform.OS}`)

	return (
		<Card
			label={translate('shared.readingDevice.device')}
			description={translate('shared.readingDevice.description')}
		>
			<Card.InputRow
				label={translate('shared.common.friendlyName')}
				value={deviceName ?? ''}
				onChangeText={setDeviceName}
				placeholder={placeholderName}
				autoCapitalize="none"
			/>
		</Card>
	)
}
