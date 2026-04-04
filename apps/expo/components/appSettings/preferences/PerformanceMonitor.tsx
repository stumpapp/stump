import { Gauge } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function PerformanceMonitor() {
	const { t } = useTranslate()
	const { performanceMonitor, patch } = usePreferencesStore(
		useShallow((state) => ({
			performanceMonitor: state.performanceMonitor,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={Gauge}
			title={t('settings.debug.performanceMonitor')}
			onPress={() => patch({ performanceMonitor: !performanceMonitor })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={performanceMonitor}
					onCheckedChange={(checked) => patch({ performanceMonitor: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
