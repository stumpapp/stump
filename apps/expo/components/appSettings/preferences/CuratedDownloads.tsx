import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function CuratedDownloads() {
	const { showCuratedDownloads, patch } = usePreferencesStore((state) => ({
		showCuratedDownloads: state.showCuratedDownloads,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon="LayoutPanelTop"
			title="Curated Downloads"
			onPress={() => patch({ showCuratedDownloads: !showCuratedDownloads })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={Boolean(showCuratedDownloads)}
					onCheckedChange={(checked) => patch({ showCuratedDownloads: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
