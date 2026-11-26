import { HatGlasses } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function DisableProgressTracking() {
	const { t } = useTranslate()
	const { disabled, setDisabled } = useReaderStore(
		useShallow((state) => ({
			disabled: state.disableProgressTracking,
			setDisabled: state.setDisableProgressTracking,
		})),
	)

	return (
		<AppSettingsRow
			icon={HatGlasses}
			iconBackgroundColor={SETTINGS_COLORS.hiding}
			title={t('settings.reading.disableProgressTracking')}
			onPress={() => setDisabled(!disabled)}
		>
			<Switch checked={disabled} onCheckedChange={setDisabled} />
		</AppSettingsRow>
	)
}
