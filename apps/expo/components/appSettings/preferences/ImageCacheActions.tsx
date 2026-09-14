import { Image } from 'lucide-react-native'
import { Alert, View } from 'react-native'
import TurboImage from 'react-native-turbo-image'

import { Button, Text } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

import AppSettingsRow from '../AppSettingsRow'

export default function ImageCacheActions() {
	const { t } = useTranslate()

	const onClearCache = async (message: string) => {
		Alert.alert(message)
	}

	return (
		<AppSettingsRow
			icon={Image}
			iconBackgroundColor={SETTINGS_COLORS.destructive}
			title={t(getKey('label'))}
		>
			<View className="gap-2 flex-row">
				<Button
					size="sm"
					roundness="full"
					variant="destructive"
					onPress={async () => {
						await TurboImage.clearMemoryCache()
						onClearCache(t(getKey('memory.success')))
					}}
				>
					<Text>{t(getKey('memory.button'))}</Text>
				</Button>

				<Button
					size="sm"
					roundness="full"
					variant="destructive"
					onPress={async () => {
						await TurboImage.clearDiskCache()
						onClearCache(t(getKey('disk.success')))
					}}
				>
					<Text>{t(getKey('disk.button'))}</Text>
				</Button>
			</View>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.debug.clearCache'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
