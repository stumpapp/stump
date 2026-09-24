import * as Application from 'expo-application'
import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

import { useTranslate } from '~/lib/hooks'

import { Card } from '../ui'

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
		<Card
			label={t('settings.supportInfo.label')}
			description={t('settings.supportInfo.description')}
		>
			<Card.Row
				label={t('settings.supportInfo.version')}
				value={
					Application.nativeApplicationVersion ? `v${Application.nativeApplicationVersion}` : '??'
				}
			/>

			<Card.Row
				label={t('settings.supportInfo.supportIdentifier')}
				value={supportID || '??'}
				selectableValue
			/>
		</Card>
	)
}
