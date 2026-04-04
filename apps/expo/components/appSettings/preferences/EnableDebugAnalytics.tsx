import { Bug } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'
import { useTranslate } from '~/lib/hooks'

export default function EnableDebugAnalytics() {
	const { t } = useTranslate()
	const { enableDebugAnalytics, patch } = usePreferencesStore(
		useShallow((state) => ({
			enableDebugAnalytics: state.enableDebugAnalytics,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={Bug}
			title={t(getKey('label'))}
			description={t(getKey('description'))}
			onPress={() => patch({ enableDebugAnalytics: !enableDebugAnalytics })}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch
					checked={enableDebugAnalytics}
					onCheckedChange={(checked) => patch({ enableDebugAnalytics: checked })}
				/>
			</View>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.debug.debugAnalytics'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
