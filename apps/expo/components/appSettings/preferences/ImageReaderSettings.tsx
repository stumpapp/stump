import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { ChevronRight, GalleryThumbnails } from 'lucide-react-native'
import { View } from 'react-native'

import ImageReaderSettingsSheet from '~/components/book/reader/image/ImageReaderSettingsSheet'
import { Icon } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

import AppSettingsRow from '../AppSettingsRow'

export default function ImageReaderSettings() {
	const { t } = useTranslate()

	return (
		<>
			<AppSettingsRow
				icon={GalleryThumbnails}
				title={t('readerSettings.title')}
				onPress={() => TrueSheet.present('imageReaderSettings')}
				isLink
			>
				<View className="gap-2 flex flex-row items-center">
					<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
				</View>
			</AppSettingsRow>

			<ImageReaderSettingsSheet detents={[1]} />
		</>
	)
}
