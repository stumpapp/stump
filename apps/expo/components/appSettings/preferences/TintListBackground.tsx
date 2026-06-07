import { PaintRoller } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function TintListBackground() {
	const { t } = useTranslate()
	const { tintListBackground, patch } = usePreferencesStore(
		useShallow((state) => ({
			tintListBackground: state.tintListBackground,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={PaintRoller}
			iconBackgroundColor={SETTINGS_COLORS.majorVisuals}
			title={t('settings.tintListBackground')}
		>
			<Switch
				checked={tintListBackground}
				onCheckedChange={(checked) => patch({ tintListBackground: checked })}
			/>
		</AppSettingsRow>
	)
}
