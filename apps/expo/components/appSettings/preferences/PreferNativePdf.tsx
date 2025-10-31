import { FileDown } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function PreferNativePdf() {
	const { preferNativePdf, patch } = usePreferencesStore((state) => ({
		preferNativePdf: state.preferNativePdf,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={FileDown}
			title="Prefer Native PDF"
			onPress={() => patch({ preferNativePdf: !preferNativePdf })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={Boolean(preferNativePdf)}
					onCheckedChange={(checked) => patch({ preferNativePdf: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
