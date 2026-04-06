import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { ChevronRight, Pilcrow } from 'lucide-react-native'
import { View } from 'react-native'

import CustomizeThemeSheet from '~/components/book/reader/epub/CustomizeThemeSheet'
import EpubSettingsSheet from '~/components/book/reader/epub/EpubSettingsSheet'
import { Icon } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

import AppSettingsRow from '../AppSettingsRow'

export default function EpubSettings() {
	const { t } = useTranslate()
	return (
		<>
			<AppSettingsRow
				icon={Pilcrow}
				title={t('epubSettings.title')}
				onPress={() => TrueSheet.present('epubSettings')}
				isLink
			>
				<View className="gap-2 flex flex-row items-center">
					<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
				</View>
			</AppSettingsRow>

			<EpubSettingsSheet detents={[1]} dimmed />
			<CustomizeThemeSheet />
		</>
	)
}
