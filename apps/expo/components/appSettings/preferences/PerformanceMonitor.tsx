import { Gauge } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function PerformanceMonitor() {
	const { performanceMonitor, patch } = usePreferencesStore((state) => ({
		performanceMonitor: state.performanceMonitor,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={Gauge}
			title="Performance Monitor"
			onPress={() => patch({ performanceMonitor: !performanceMonitor })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={performanceMonitor}
					onCheckedChange={(checked) => patch({ performanceMonitor: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
