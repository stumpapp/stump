import { Rabbit } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function ReduceAnimations() {
	const { t } = useTranslate()
	const { reduceAnimations, patch } = usePreferencesStore(
		useShallow((state) => ({
			reduceAnimations: state.reduceAnimations,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={Rabbit}
			iconBackgroundColor={SETTINGS_COLORS.majorVisuals}
			title={t('settings.debug.reduceAnimations')}
			onPress={() => patch({ reduceAnimations: !reduceAnimations })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={reduceAnimations}
					onCheckedChange={(checked) => patch({ reduceAnimations: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
