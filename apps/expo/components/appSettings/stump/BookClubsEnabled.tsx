import { Users } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function BookClubsEnabled() {
	const { bookClubsEnabled, patch } = usePreferencesStore((state) => ({
		bookClubsEnabled: state.bookClubsEnabled,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={Users}
			title="Book Club Features"
			onPress={() => patch({ bookClubsEnabled: !bookClubsEnabled })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={bookClubsEnabled}
					onCheckedChange={(checked) => patch({ bookClubsEnabled: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
