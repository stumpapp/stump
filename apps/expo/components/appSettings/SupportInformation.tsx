import * as Application from 'expo-application'
import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'

import { Text } from '../ui'

export default function SupportInformation() {
	const [supportID, setSupportID] = useState<string | null>(null)

	useEffect(() => {
		async function getSupportID() {
			if (Platform.OS === 'ios') {
				setSupportID(await Application.getIosIdForVendorAsync())
			} else {
				setSupportID(Application.getAndroidId())
			}
		}

		if (!supportID) {
			getSupportID()
		}
	}, [supportID])

	return (
		<View>
			<Text className="mb-3 text-foreground-muted">Build Information</Text>
			<Text className="text-foreground-muted">Version: {Application.nativeApplicationVersion}</Text>
			<Text className="text-foreground-muted">Support Identifier: {supportID}</Text>
		</View>
	)
}
