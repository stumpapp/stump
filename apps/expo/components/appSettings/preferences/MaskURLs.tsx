import { Link } from 'lucide-react-native'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function MaskURLs() {
	const { t } = useTranslate()
	const { maskURLs, setMaskURLs } = usePreferencesStore(
		useShallow((state) => ({
			maskURLs: state.maskURLs,
			setMaskURLs: state.setMaskURLs,
		})),
	)

	return (
		<AppSettingsRow
			icon={Link}
			title={t('settings.debug.maskUrls')}
			onPress={() => setMaskURLs(!maskURLs)}
		>
			<View className="gap-2 flex flex-row items-center">
				<Switch checked={maskURLs} onCheckedChange={setMaskURLs} />
			</View>
		</AppSettingsRow>
	)
}
