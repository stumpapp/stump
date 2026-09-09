import { Link } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export function MaskUrls() {
	const { t } = useTranslate()
	const { maskUrls, patch } = usePreferencesStore(
		useShallow((state) => ({
			maskUrls: state.maskUrls,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={Link}
			iconBackgroundColor={SETTINGS_COLORS.hiding}
			title={t('settings.debug.maskUrls')}
			onPress={() => patch({ maskUrls: !maskUrls })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch checked={maskUrls} onCheckedChange={(value) => patch({ maskUrls: value })} />
			</View>
		</AppSettingsRow>
	)
}
