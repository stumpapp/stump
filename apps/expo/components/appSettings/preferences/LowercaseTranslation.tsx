import { CaseLower } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function LowercaseTranslation() {
	const { t } = useTranslate()
	const { lowercaseTranslation, patch } = usePreferencesStore(
		useShallow((state) => ({
			lowercaseTranslation: state.lowercaseTranslation,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={CaseLower}
			iconBackgroundColor={SETTINGS_COLORS.interactive}
			title={t('settings.lowercaseTranslation')}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={lowercaseTranslation}
					onCheckedChange={(checked) => patch({ lowercaseTranslation: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
