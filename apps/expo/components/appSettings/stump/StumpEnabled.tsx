import { Box } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useSavedServers } from '~/stores/savedServer'

import AppSettingsRow from '../AppSettingsRow'

export default function StumpEnabled() {
	const { t } = useTranslate()
	const { stumpEnabled, setStumpEnabled } = useSavedServers()

	return (
		<AppSettingsRow
			icon={Box}
			title={t('common.enabled')}
			onPress={() => setStumpEnabled(!stumpEnabled)}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch checked={stumpEnabled} onCheckedChange={setStumpEnabled} />
			</View>
		</AppSettingsRow>
	)
}
