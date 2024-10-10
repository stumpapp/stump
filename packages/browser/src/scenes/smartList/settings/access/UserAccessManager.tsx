import { Alert } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

// TODO: lock down access to CoCreator?
export default function UserAccessManager() {
	const { t } = useLocaleContext()

	return (
		<div>
			<Alert level="info" icon="warning">
				<Alert.Content>{t(getKey('disclaimer'))}</Alert.Content>
			</Alert>
		</div>
	)
}

const LOCALE_KEY = 'smartListSettingsScene.access.sections.accessManager'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
