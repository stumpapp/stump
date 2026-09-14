import { HatGlasses } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function GlobalIncognito() {
	const { t } = useTranslate()
	const { incognito, updateGlobalSettings } = useReaderStore(
		useShallow((state) => ({
			incognito: state.globalSettings.incognito,
			updateGlobalSettings: state.setGlobalSettings,
		})),
	)

	return (
		<AppSettingsRow
			icon={HatGlasses}
			iconBackgroundColor={SETTINGS_COLORS.hiding}
			title={t('settings.reading.incognitoReading')}
			onPress={() => updateGlobalSettings({ incognito: !incognito })}
		>
			<Switch
				checked={Boolean(incognito)}
				onCheckedChange={(checked) => updateGlobalSettings({ incognito: checked })}
			/>
		</AppSettingsRow>
	)
}
