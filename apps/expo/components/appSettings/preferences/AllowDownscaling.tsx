import { ImageDown } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function AllowDownscaling() {
	const { t } = useTranslate()
	const { allowDownscaling, patch } = usePreferencesStore(
		useShallow((state) => ({
			allowDownscaling: state.allowDownscaling,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={ImageDown}
			title={t('readerSettings.allowDownscaling')}
			onPress={() => patch({ allowDownscaling: !allowDownscaling })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={allowDownscaling}
					onCheckedChange={(checked) => patch({ allowDownscaling: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
