import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { useSavedServerStore } from '~/stores/savedServer'

import AppSettingsRow from '../AppSettingsRow'

export default function MaskURLs() {
	const { stumpEnabled, setStumpEnabled } = useSavedServerStore((state) => ({
		stumpEnabled: state.showStumpServers,
		setStumpEnabled: state.setShowStumpServers,
	}))

	return (
		<AppSettingsRow icon="Box" title="Enabled" onPress={() => setStumpEnabled(!stumpEnabled)}>
			<View className="flex flex-row items-center gap-2">
				<Switch checked={stumpEnabled} onCheckedChange={setStumpEnabled} />
			</View>
		</AppSettingsRow>
	)
}
