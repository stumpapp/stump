import { Spotlight } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function PreferMinimalReader() {
	const { t } = useTranslate()
	const { preferMinimalReader, patch } = usePreferencesStore(
		useShallow((state) => ({
			preferMinimalReader: state.preferMinimalReader,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={Spotlight}
			title={t('settings.reading.preferMinimalReader')}
			onPress={() => patch({ preferMinimalReader: !preferMinimalReader })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={preferMinimalReader}
					onCheckedChange={(checked) => patch({ preferMinimalReader: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
