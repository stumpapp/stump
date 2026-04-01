import { Bug } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function EnableDebugAnalytics() {
	const { enableDebugAnalytics, patch } = usePreferencesStore(
		useShallow((state) => ({
			enableDebugAnalytics: state.enableDebugAnalytics,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={Bug}
			title="Debug Analytics"
			description="Send additional debug-related events to help troubleshoot issues"
			onPress={() => patch({ enableDebugAnalytics: !enableDebugAnalytics })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={enableDebugAnalytics}
					onCheckedChange={(checked) => patch({ enableDebugAnalytics: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
