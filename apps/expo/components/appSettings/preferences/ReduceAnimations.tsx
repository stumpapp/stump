import { Rabbit } from 'lucide-react-native'
import { View } from 'react-native'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function ReduceAnimations() {
	const { reduceAnimations, patch } = usePreferencesStore((state) => ({
		reduceAnimations: state.reduceAnimations,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow
			icon={Rabbit}
			title="Reduce Animations"
			onPress={() => patch({ reduceAnimations: !reduceAnimations })}
		>
			<View className="flex flex-row items-center gap-2">
				<Switch
					checked={reduceAnimations}
					onCheckedChange={(checked) => patch({ reduceAnimations: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
