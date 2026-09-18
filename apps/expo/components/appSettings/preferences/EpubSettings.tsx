import { ChevronRight, Pilcrow } from 'lucide-react-native'
import { View } from 'react-native'

import CustomizeThemeSheet from '~/components/book/reader/epub/CustomizeThemeSheet'
import EpubSettingsSheet from '~/components/book/reader/epub/EpubSettingsSheet'
import { Icon } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useEpubSheetStore } from '~/stores/epubSheet'

import AppSettingsRow from '../AppSettingsRow'

export default function EpubSettings() {
	const { t } = useTranslate()
	const openSheet = useEpubSheetStore((state) => state.openSheet)
	return (
		<>
			<AppSettingsRow
				icon={Pilcrow}
				iconBackgroundColor={SETTINGS_COLORS.majorVisuals}
				title={t('epubSettings.title')}
				onPress={() => openSheet('settings')}
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
