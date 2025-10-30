import { Link } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function MaskURLs() {
	const { maskURLs, setMaskURLs } = usePreferencesStore((state) => ({
		maskURLs: state.maskURLs,
		setMaskURLs: state.setMaskURLs,
	}))

	return (
		<AppSettingsRow icon={Link} title="Mask URLs" onPress={() => setMaskURLs(!maskURLs)}>
			<View className="flex flex-row items-center gap-2">
				<Switch checked={maskURLs} onCheckedChange={setMaskURLs} />
			</View>
		</AppSettingsRow>
	)
}
