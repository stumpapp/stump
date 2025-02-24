import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { useSavedServers } from '~/stores/savedServer'

import AppSettingsRow from '../AppSettingsRow'

export default function MaskURLs() {
	const { stumpEnabled, setStumpEnabled } = useSavedServers()

	return (
		<AppSettingsRow icon="Box" title="Enabled" onPress={() => setStumpEnabled(!stumpEnabled)}>
			<View className="flex flex-row items-center gap-2">
				<Switch checked={stumpEnabled} onCheckedChange={setStumpEnabled} />
			</View>
		</AppSettingsRow>
	)
}
