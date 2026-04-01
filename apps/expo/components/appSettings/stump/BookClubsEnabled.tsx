import { Users } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function BookClubsEnabled() {
	const { bookClubsEnabled, patch } = usePreferencesStore(
		useShallow((state) => ({
			bookClubsEnabled: state.bookClubsEnabled,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={Users}
			title="Book Club Features"
			onPress={() => patch({ bookClubsEnabled: !bookClubsEnabled })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={bookClubsEnabled}
					onCheckedChange={(checked) => patch({ bookClubsEnabled: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
