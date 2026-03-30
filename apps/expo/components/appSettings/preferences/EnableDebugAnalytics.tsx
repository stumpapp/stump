import { Bug } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function EnableDebugAnalytics() {
	const { enableDebugAnalytics, patch } = usePreferencesStore((state) => ({
		enableDebugAnalytics: state.enableDebugAnalytics,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={Bug}
			title="Debug Analytics"
			description="Send additional debug-related events to help troubleshoot issues"
			onPress={() => patch({ enableDebugAnalytics: !enableDebugAnalytics })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={enableDebugAnalytics}
					onCheckedChange={(checked) => patch({ enableDebugAnalytics: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
