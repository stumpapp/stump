import { RefreshCw } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function AutoSyncOfflineProgress() {
	const { autoSyncOfflineProgress, patch } = usePreferencesStore((state) => ({
		autoSyncOfflineProgress: state.autoSyncOfflineProgress,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={RefreshCw}
			title="Auto-Sync Offline Progress"
			onPress={() => patch({ autoSyncOfflineProgress: !autoSyncOfflineProgress })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={autoSyncOfflineProgress}
					onCheckedChange={(checked) => patch({ autoSyncOfflineProgress: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
