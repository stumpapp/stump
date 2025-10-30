import { ImageDown } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function AllowDownscaling() {
	const { allowDownscaling, patch } = usePreferencesStore((state) => ({
		allowDownscaling: state.allowDownscaling,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={ImageDown}
			title="Allow Downscaling"
			onPress={() => patch({ allowDownscaling: !allowDownscaling })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={allowDownscaling}
					onCheckedChange={(checked) => patch({ allowDownscaling: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
