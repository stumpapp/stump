import { RefreshCw } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function AutoSyncLocalData() {
	const { t } = useTranslate()
	const { autoSyncLocalData, patch } = usePreferencesStore(
		useShallow((state) => ({
			autoSyncLocalData: state.autoSyncLocalData,
			patch: state.patch,
		})),
	)

	// note: i didn't nest in stump in locale file since eventually opds v2 will
	// have better syncing features
	return (
		<AppSettingsRow
			icon={RefreshCw}
			title={t('settings.autoSyncLocalData')}
			onPress={() => patch({ autoSyncLocalData: !autoSyncLocalData })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={autoSyncLocalData}
					onCheckedChange={(checked) => patch({ autoSyncLocalData: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
