import { ArrowRightFromLine } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function DisableDismissGesture() {
	const { disableDismissGesture, patch } = usePreferencesStore((state) => ({
		disableDismissGesture: state.disableDismissGesture,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={ArrowRightFromLine}
			title="Disable Dismiss Gesture"
			onPress={() => patch({ disableDismissGesture: !disableDismissGesture })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={disableDismissGesture}
					onCheckedChange={(checked) => patch({ disableDismissGesture: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
