import * as Application from 'expo-application'
import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'

import { useTranslate } from '~/lib/hooks'

import { Text } from '../ui'

export default function SupportInformation() {
	const { t } = useTranslate()

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
			<Text className="mb-3 text-foreground-muted">
				{t('settings.supportInfo.buildInformation')}
			</Text>
			<Text className="text-foreground-muted">
				{t('settings.supportInfo.version').replace(
					'{{version}}',
					Application.nativeApplicationVersion || '??',
				)}
			</Text>
			<Text className="text-foreground-muted">
				{t('settings.supportInfo.suuportIdentifier').replace('{{supportID}}', supportID || '??')}
			</Text>
		</View>
	)
}
