import { ArrowRightFromLine } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function DisableDismissGesture() {
	const { t } = useTranslate()
	const { disableDismissGesture, patch } = usePreferencesStore(
		useShallow((state) => ({
			disableDismissGesture: state.disableDismissGesture,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={ArrowRightFromLine}
			title={t('settings.reading.disableDismissGesture')}
			onPress={() => patch({ disableDismissGesture: !disableDismissGesture })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={disableDismissGesture}
					onCheckedChange={(checked) => patch({ disableDismissGesture: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}
