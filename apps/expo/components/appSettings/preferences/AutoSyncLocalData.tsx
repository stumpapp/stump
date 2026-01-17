import { RefreshCw } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function AutoSyncLocalData() {
	const { autoSyncLocalData, patch } = usePreferencesStore((state) => ({
		autoSyncLocalData: state.autoSyncLocalData,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={RefreshCw}
			title="Auto-Sync Local Data"
			onPress={() => patch({ autoSyncLocalData: !autoSyncLocalData })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={autoSyncLocalData}
					onCheckedChange={(checked) => patch({ autoSyncLocalData: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
