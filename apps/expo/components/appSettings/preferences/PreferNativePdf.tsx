import { FileDown } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function PreferNativePdf() {
	const { t } = useTranslate()
	const { preferNativePdf, patch } = usePreferencesStore(
		useShallow((state) => ({
			preferNativePdf: state.preferNativePdf,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={FileDown}
			title={t('settings.reading.preferNativePdf')}
			onPress={() => patch({ preferNativePdf: !preferNativePdf })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={Boolean(preferNativePdf)}
					onCheckedChange={(checked) => patch({ preferNativePdf: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
