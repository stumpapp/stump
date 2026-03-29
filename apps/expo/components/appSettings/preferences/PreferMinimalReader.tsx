import { Spotlight } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function PreferMinimalReader() {
	const { preferMinimalReader, patch } = usePreferencesStore((state) => ({
		preferMinimalReader: state.preferMinimalReader,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={Spotlight}
			title="Prefer Minimal Reader"
			onPress={() => patch({ preferMinimalReader: !preferMinimalReader })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={preferMinimalReader}
					onCheckedChange={(checked) => patch({ preferMinimalReader: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
